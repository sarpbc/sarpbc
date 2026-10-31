import { NotFoundError } from "../../../common/domain/errors";
import type { EntityRef } from "../../../common/domain/entity-ref";
import type { NewsMatchBlock } from "@sarpbc/utils";
import { Match, matchPublicSlug } from "../../domain/competition";
import { matchDecided } from "../../domain/match-decided";
import type { MatchListQueryOptions } from "./match-list-filters";
import { buildHeadToHead, type HeadToHead } from "./match-head-to-head";
import type {
  CompetitionDiagnostics,
  CompetitionEvents,
  CompetitionTransaction,
  MatchQueries,
} from "../ports";
import type { UpdateMatchInput, UpsertMatchInput } from "../inputs";
import type { MatchVodInput, MatchVodLink } from "../../domain/match-vod";
import {
  upsertMatchInTransaction,
  setGameVodsInTransaction,
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
    private readonly events: CompetitionEvents,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}

  async findUpcoming(options: MatchListQueryOptions = {}): Promise<Match[]> {
    return (await this.reads.list("upcoming", options))[0];
  }

  async findLive(options: MatchListQueryOptions = {}): Promise<Match[]> {
    return (await this.reads.list("live", options))[0];
  }

  async findResults(options: MatchListQueryOptions = {}): Promise<Match[]> {
    return (await this.reads.list("results", options))[0];
  }

  async findUpcomingAndCount(options: MatchListQueryOptions = {}): Promise<[Match[], number]> {
    return this.reads.list("upcoming", options);
  }

  async findLiveAndCount(options: MatchListQueryOptions = {}): Promise<[Match[], number]> {
    return this.reads.list("live", options);
  }

  async findResultsAndCount(options: MatchListQueryOptions = {}): Promise<[Match[], number]> {
    return this.reads.list("results", options);
  }

  async findBlocks(blocks: readonly NewsMatchBlock[]): Promise<Match[][]> {
    const ids = [
      ...new Set(
        blocks.flatMap((block) =>
          block.kind === "match" ? [block.id] : block.kind === "matches" ? block.ids : [],
        ),
      ),
    ];
    const [byId, scoped] = await Promise.all([
      ids.length > 0 ? this.reads.byIds(ids) : Promise.resolve([]),
      Promise.all(blocks.map((block) => this.findScopedBlock(block))),
    ]);
    const matches = new Map(byId.map((match) => [match.id, match]));
    const pick = (id: string): Match[] => {
      const match = matches.get(id);
      return match ? [match] : [];
    };

    return blocks.map((block, index) => {
      switch (block.kind) {
        case "match":
          return pick(block.id);
        case "matches":
          return block.ids.flatMap(pick);
        case "tournament":
        case "team":
          return scoped[index] ?? [];
        default: {
          const exhaustive: never = block;
          return exhaustive;
        }
      }
    });
  }

  private async findScopedBlock(block: NewsMatchBlock): Promise<Match[]> {
    if (block.kind !== "tournament" && block.kind !== "team") {
      return [];
    }
    const options = {
      limit: block.limit,
      ...(block.kind === "tournament" ? { tournamentId: block.id } : { teamId: block.id }),
    };
    const [live, upcoming, results] = await Promise.all([
      this.reads.page("live", options),
      this.reads.page("upcoming", options),
      this.reads.page("results", options),
    ]);
    return [...live, ...upcoming, ...results].slice(0, block.limit);
  }

  async findRecentlyEnded({
    limit = 100,
    minutesAgo = 15,
  }: {
    limit?: number;
    minutesAgo?: number;
  }): Promise<Match[]> {
    return this.reads.recentlyEnded({ limit, minutesAgo });
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
    const participants = match.participants;
    if (participants.length !== 2) {
      return null;
    }

    const teamAId = participants[0].team.id;
    const teamBId = participants[1].team.id;

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
      participants.map(async (participant) => {
        const teamId = participant.team.id;
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
    const teamParticipant = participants.find((p) => p.team.id === teamId);
    const opponentParticipant = participants.find((p) => p.team.id !== teamId);

    if (!teamParticipant || !opponentParticipant) {
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
        id: opponentParticipant.team.id,
        name: opponentParticipant.team.name,
        slug: opponentParticipant.team.slug,
        imageUrl: opponentParticipant.team.imageUrl,
      },
      score: { team: teamScore, opponent: opponentScore },
      outcome: this.getTeamMatchOutcome(match, teamId),
    };
  }

  private getTeamMatchOutcome(match: Match, teamId: string): "win" | "loss" | null {
    if (match.winner?.team?.id) {
      return match.winner.team.id === teamId ? "win" : "loss";
    }

    const participants = match.participants;
    if (participants.length !== 2) {
      return null;
    }

    const teamParticipant = participants.find((p) => p.team.id === teamId);
    const opponentParticipant = participants.find((p) => p.team.id !== teamId);

    if (!teamParticipant || !opponentParticipant) {
      return null;
    }

    const results = match.results;
    const teamScore = results.find((r) => r.participant.id === teamParticipant.id)?.score;
    const opponentScore = results.find((r) => r.participant.id === opponentParticipant.id)?.score;

    if (teamScore === undefined || opponentScore === undefined) {
      return null;
    }

    if (teamScore > opponentScore) {
      return "win";
    }

    if (teamScore < opponentScore) {
      return "loss";
    }

    return null;
  }

  async upsertMatch(tournamentId: string, input: UpsertMatchInput): Promise<Match> {
    const written = await this.transaction.run(({ matches }) =>
      upsertMatchInTransaction(matches, tournamentId, input),
    );
    const match = await this.committed(written.id);
    await this.publishDecided(match);
    return match;
  }
  async setMatchWinner(matchId: string, winnerId: string): Promise<Match> {
    const written = await this.transaction.run(({ matches }) =>
      setWinnerInTransaction(matches, matchId, winnerId),
    );
    const match = await this.committed(written.id);
    await this.publishDecided(match);
    return match;
  }
  async updateMatch(matchId: string, input: UpdateMatchInput): Promise<Match> {
    const written = await this.transaction.run(({ matches }) =>
      updateMatchInTransaction(matches, matchId, input),
    );
    const match = await this.committed(written.id);
    await this.publishDecided(match);
    return match;
  }
  async setVods(matchId: string, vods: readonly MatchVodInput[]): Promise<Match> {
    const written = await this.transaction.run(({ matches }) =>
      setVodsInTransaction(matches, matchId, vods),
    );
    return this.committed(written.id);
  }
  async setGameVods(matchId: string, game: number, links: readonly MatchVodLink[]): Promise<Match> {
    const written = await this.transaction.run(({ matches }) =>
      setGameVodsInTransaction(matches, matchId, game, links),
    );
    return this.committed(written.id);
  }
  private async committed(id: string): Promise<Match> {
    const match = await this.reads.detail({ kind: "id", value: id });
    if (!match) throw new NotFoundError("Match not found");
    return match;
  }
  private async publishDecided(match: Match) {
    if (match.isDecided()) {
      try {
        await this.events.publish(matchDecided(match.id));
      } catch (error) {
        this.diagnostics.error("MatchDecided publication failed", error);
      }
    }
  }
  async getMatchesByPlayer(id: string) {
    return this.reads.byPlayer(id);
  }
  async getMatchesByTeam(id: string) {
    return this.reads.byTeam(id);
  }
  async getMatchesByTournament(id: string) {
    return this.reads.byTournament(id);
  }
}
