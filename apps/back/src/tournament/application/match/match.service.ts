import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@sarpbc/utils";
import { isRedistributable } from "../../../common/domain/data-source";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import type { EntityRef } from "../../../common/domain/entity-ref";
import type { MatchBlockSelector } from "@sarpbc/types";
import { winnerFromResults } from "@sarpbc/utils";
import { Match, matchPublicSlug } from "../../domain/competition";
import { assertMatchDeletable } from "../../domain/match-deletion";
import type { MatchListKind, MatchListQueryOptions } from "./match-list-filters";
import { findMatchBlocks } from "./match-blocks";
import { buildHeadToHead, type HeadToHead } from "./match-head-to-head";
import type { CompetitionAfterCommit } from "../after-commit";
import type { CompetitionTransaction, MatchQueries, MatchWriter } from "../ports";
import type { EmptyBracketInput, ManualMatchInput, UpdateMatchInput } from "../inputs";
import type { MatchVodInput, MatchVodLink } from "../../domain/match-vod";
import {
  createEmptyBracketInTransaction,
  createMatchInTransaction,
  setGameVodsInTransaction,
  setSourceInTransaction,
  setVodsInTransaction,
  setWinnerInTransaction,
  updateMatchInTransaction,
} from "./write-match";

const RECENT_FORM_LIMIT = 5;

export interface TeamFormRecord {
  wins: number;
  losses: number;
}

export interface TeamFormOpponent {
  id: string;
  name: string;
  slug?: string | null;
  imageUrl?: string | null;
}

export interface TeamFormMatchScore {
  team: number | null;
  opponent: number | null;
}

export interface TeamFormMatchEntry {
  id: string;
  publicId: number;
  slug: string;
  beginAt?: Date | null;
  endAt?: Date | null;
  opponent: TeamFormOpponent;
  score: TeamFormMatchScore;
  outcome: "win" | "loss" | null;
}

export interface TeamForm {
  recent: TeamFormMatchEntry[];
  record: TeamFormRecord;
}

export type TeamFormsMap = Record<string, TeamForm>;

export class MatchService {
  constructor(
    private readonly reads: MatchQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}

  async list(
    kind: MatchListKind,
    { limit = DEFAULT_PAGE_SIZE, ...options }: MatchListQueryOptions = {},
  ): Promise<[Match[], number]> {
    return await this.reads.list(kind, { ...options, limit: Math.min(limit, MAX_PAGE_SIZE) });
  }

  async findBlocks(blocks: readonly MatchBlockSelector[], now: Date): Promise<Match[][]> {
    return await findMatchBlocks(this.reads, blocks, now);
  }

  async findRecentlyEnded({
    limit = 100,
    minutesAgo = 15,
  }: {
    limit?: number;
    minutesAgo?: number;
  } = {}): Promise<Match[]> {
    return await this.reads.recentlyEnded({ limit, minutesAgo });
  }

  async findDetail(
    ref: EntityRef,
  ): Promise<{ match: Match; teamForms: TeamFormsMap; headToHead: HeadToHead | null }> {
    const match = await this.reads.detail(ref);

    if (!match) {
      throw new NotFoundError(
        "This match could not be found. Check the link or browse matches from the homepage.",
      );
    }

    const [teamForms, headToHead] = await Promise.all([
      this.buildTeamForms(match),
      this.buildHeadToHead(match),
    ]);

    return { match, teamForms, headToHead };
  }

  private async buildHeadToHead(match: Match): Promise<HeadToHead | null> {
    const [teamA, teamB] = match.participants.map((participant) => participant.team);

    if (match.participants.length !== 2 || !teamA || !teamB) {
      return null;
    }

    const teamAId = teamA.id;
    const teamBId = teamB.id;

    const historicalMatches = await this.reads.betweenTeams({
      teamAId,
      teamBId,
      excludeMatchId: match.id,
      limit: 20,
    });

    return buildHeadToHead(historicalMatches, teamAId, teamBId);
  }

  private async buildTeamForms(match: Match): Promise<TeamFormsMap> {
    const participants = match.participants;
    const teamForms: TeamFormsMap = {};

    await Promise.all(
      participants.map(async ({ team }) => {
        if (!team) return;
        const teamId = team.id;

        const recent = await this.reads.recentByTeam({
          teamId,
          excludeMatchId: match.id,
          limit: RECENT_FORM_LIMIT,
        });

        const entries = recent
          .map((recentMatch) => this.mapTeamFormEntry(recentMatch, teamId))
          .filter((entry): entry is TeamFormMatchEntry => entry !== null);

        const record = entries.reduce<TeamFormRecord>(
          (acc, entry) => {
            if (entry.outcome === "win") {
              acc.wins += 1;
            } else if (entry.outcome === "loss") {
              acc.losses += 1;
            }

            return acc;
          },
          { wins: 0, losses: 0 },
        );

        teamForms[teamId] = { recent: entries, record };
      }),
    );

    return teamForms;
  }

  private mapTeamFormEntry(match: Match, teamId: string): TeamFormMatchEntry | null {
    const participants = match.participants;
    const teamParticipant = participants.find((p) => p.team?.id === teamId);
    const opponentParticipant = participants.find((p) => p.team?.id !== teamId);
    const opponent = opponentParticipant?.team;

    if (!teamParticipant || !opponentParticipant || !opponent) {
      return null;
    }

    const results = match.results;
    const teamScore = results.find((r) => r.participant.id === teamParticipant.id)?.score ?? null;

    const opponentScore =
      results.find((r) => r.participant.id === opponentParticipant.id)?.score ?? null;

    return {
      id: match.id,
      publicId: match.publicId,
      slug: matchPublicSlug(match),
      beginAt: match.beginAt,
      endAt: match.endAt,
      opponent: {
        id: opponent.id,
        name: opponent.name,
        slug: opponent.slug,
        imageUrl: opponent.imageUrl,
      },
      score: { team: teamScore, opponent: opponentScore },
      outcome: this.getTeamMatchOutcome(match, teamId),
    };
  }

  private getTeamMatchOutcome(match: Match, teamId: string): "win" | "loss" | null {
    if (match.winner?.team?.id !== undefined && match.winner?.team?.id !== "") {
      return match.winner.team.id === teamId ? "win" : "loss";
    }

    const participants = match.participants;

    if (participants.length !== 2) {
      return null;
    }

    const teamParticipant = participants.find((p) => p.team?.id === teamId);
    const opponentParticipant = participants.find((p) => p.team?.id !== teamId);

    if (!teamParticipant || !opponentParticipant) {
      return null;
    }

    const winnerParticipantId = winnerFromResults(
      match.results
        .filter(
          (r) =>
            r.participant.id === teamParticipant.id || r.participant.id === opponentParticipant.id,
        )
        .map((r) => ({ participantId: r.participant.id, score: r.score })),
    );

    if (winnerParticipantId === null) {
      return null;
    }

    return winnerParticipantId === teamParticipant.id ? "win" : "loss";
  }

  async createMatch(tournamentId: string, input: ManualMatchInput): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await createMatchInTransaction(matches, tournamentId, input),
    );

    return await this.settled(written.id);
  }
  async createEmptyBracket(tournamentId: string, input: EmptyBracketInput): Promise<Match[]> {
    const written = await this.transaction.run(
      async ({ matches }) => await createEmptyBracketInTransaction(matches, tournamentId, input),
    );

    await this.afterCommit.settle({ tournamentIds: [tournamentId] });

    return await this.reads.byIds(written.map((match) => match.id));
  }
  async setMatchWinner(matchId: string, winnerId: string): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await setWinnerInTransaction(matches, matchId, winnerId),
    );

    return await this.settled(written.id);
  }
  async updateMatch(matchId: string, input: UpdateMatchInput): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await updateMatchInTransaction(matches, matchId, input),
    );

    return await this.settled(written.id);
  }
  async setVods(matchId: string, vods: readonly MatchVodInput[]): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await setVodsInTransaction(matches, matchId, vods),
    );

    return await this.committed(written.id);
  }
  async setSource(matchId: string, sourceUrl: string | null): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await setSourceInTransaction(matches, matchId, sourceUrl),
    );

    const match = await this.committed(written.id);
    await this.afterCommit.settle({ tournamentIds: [match.tournament.id] });

    return match;
  }
  async setGameVods(matchId: string, game: number, links: readonly MatchVodLink[]): Promise<Match> {
    const written = await this.transaction.run(
      async ({ matches }) => await setGameVodsInTransaction(matches, matchId, game, links),
    );

    return await this.committed(written.id);
  }
  async requireProposableDeletion(id: string): Promise<void> {
    await this.transaction.run(async ({ matches }) => {
      const match = await matches.load(id);

      if (!match) throw new NotFoundError("Match not found");

      if (!isRedistributable(match.source) || !isRedistributable(match.tournament.source))
        throw new InvalidInputError("Deleting start.gg matches cannot be proposed");
      await assertDeletable(matches, match);
    });
  }
  async deleteMatch(id: string): Promise<void> {
    const tournamentId = await this.transaction.run(async ({ matches }) => {
      const match = await matches.load(id);

      if (!match) throw new NotFoundError("Match not found");
      await assertDeletable(matches, match);
      await matches.remove(id);

      return match.tournament.id;
    });

    await this.afterCommit.settle({ tournamentIds: [tournamentId] });
  }
  async find(id: string): Promise<Match | null> {
    return await this.reads.detail({ kind: "id", value: id });
  }
  private async committed(id: string): Promise<Match> {
    const match = await this.find(id);

    if (!match) throw new NotFoundError("Match not found");

    return match;
  }
  private async settled(id: string): Promise<Match> {
    const match = await this.committed(id);
    await this.afterCommit.settle({
      tournamentIds: [match.tournament.id],
      decidedMatchIds: match.isDecided() ? [match.id] : [],
    });

    return match;
  }
  async getMatchesByPlayer(id: string) {
    return await this.reads.byPlayer(id);
  }
  async getMatchesByTeam(id: string) {
    return await this.reads.byTeam(id);
  }
  async getMatchesByTournament(id: string) {
    return await this.reads.byTournament(id);
  }
}

async function assertDeletable(matches: MatchWriter, match: Match): Promise<void> {
  assertMatchDeletable(match, await matches.references(match.id));
}
