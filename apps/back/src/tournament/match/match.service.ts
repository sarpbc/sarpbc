import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { MatchRepository } from "./match.repository";
import { Match } from "./match.entity";
import { TournamentParticipantRepository } from "../tournament-participant.repository";
import { TournamentRepository } from "../tournament.repository";
import { BracketLink } from "./bracket-link.entity";
import { MatchResult } from "./match-result.entity";

const RECENT_FORM_LIMIT = 5;

export interface TeamFormRecord {
  wins: number;
  losses: number;
}

export interface TeamFormOpponent {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
}

export interface TeamFormMatchScore {
  team: number | null;
  opponent: number | null;
}

export interface TeamFormMatchEntry {
  id: string;
  beginAt?: Date;
  endAt?: Date;
  opponent: TeamFormOpponent;
  score: TeamFormMatchScore;
  outcome: "win" | "loss" | null;
}

export interface TeamForm {
  recent: TeamFormMatchEntry[];
  record: TeamFormRecord;
}

export type TeamFormsMap = Record<string, TeamForm>;

@Injectable()
export class MatchService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly tournamentRepository: TournamentRepository,
    private readonly participantRepository: TournamentParticipantRepository,
    private readonly em: EntityManager,
  ) {}

  async findUpcoming({
    limit = 20,
    offset = 0,
    todayOnly = false,
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<Match[]> {
    return this.matchRepository.findUpcoming({ limit, offset, todayOnly });
  }

  async findLive({
    limit = 20,
    offset = 0,
    todayOnly = false,
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<Match[]> {
    return this.matchRepository.findLive({ limit, offset, todayOnly });
  }

  async findResults({
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Match[]> {
    return this.matchRepository.findResults({ limit, offset });
  }

  async findUpcomingAndCount({
    limit = 20,
    offset = 0,
    todayOnly = false,
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<[Match[], number]> {
    return this.matchRepository.findUpcomingAndCount({ limit, offset, todayOnly });
  }

  async findLiveAndCount({
    limit = 20,
    offset = 0,
    todayOnly = false,
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<[Match[], number]> {
    return this.matchRepository.findLiveAndCount({ limit, offset, todayOnly });
  }

  async findResultsAndCount({
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<[Match[], number]> {
    return this.matchRepository.findResultsAndCount({ limit, offset });
  }

  async findRecentlyEnded({
    limit = 100,
    minutesAgo = 15,
  }: {
    limit?: number;
    minutesAgo?: number;
  }): Promise<Match[]> {
    return this.matchRepository.findRecentlyEnded({ limit, minutesAgo });
  }

  async findDetailById(id: string): Promise<{ match: Match; teamForms: TeamFormsMap }> {
    const match = await this.matchRepository.findDetailById(id);

    if (!match) {
      throw new NotFoundException(
        "This match could not be found. Check the link or browse matches from the homepage.",
      );
    }

    const teamForms = await this.buildTeamForms(match);

    return { match, teamForms };
  }

  private async buildTeamForms(match: Match): Promise<TeamFormsMap> {
    const participants = match.participants.getItems();
    const teamForms: TeamFormsMap = {};

    await Promise.all(
      participants.map(async (participant) => {
        const teamId = participant.team.id;
        const recent = await this.matchRepository.findRecentFinishedByTeamId({
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
    const participants = match.participants.getItems();
    const teamParticipant = participants.find((p) => p.team.id === teamId);
    const opponentParticipant = participants.find((p) => p.team.id !== teamId);

    if (!teamParticipant || !opponentParticipant) {
      return null;
    }

    const results = match.results.getItems();
    const teamScore = results.find((r) => r.participant.id === teamParticipant.id)?.score ?? null;
    const opponentScore =
      results.find((r) => r.participant.id === opponentParticipant.id)?.score ?? null;

    return {
      id: match.id,
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

    const participants = match.participants.getItems();
    if (participants.length !== 2) {
      return null;
    }

    const teamParticipant = participants.find((p) => p.team.id === teamId);
    const opponentParticipant = participants.find((p) => p.team.id !== teamId);

    if (!teamParticipant || !opponentParticipant) {
      return null;
    }

    const results = match.results.getItems();
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

  async upsertMatch(
    tournamentId: string,
    matchData: {
      name: string;
      slug?: string;
      beginAt?: Date;
      endAt?: Date;
      status?: string;
      numberOfGames?: number;
      participantIds: string[];
      pandascoreId?: number;
      previous_matches?: { type: "winner" | "loser"; match_id: number }[];
      results?: { participantId: string | null; score: number }[];
    },
  ): Promise<Match> {
    const tournament = await this.tournamentRepository.findOne({
      id: tournamentId,
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const participants = await this.participantRepository.find({
      tournament: tournament,
      id: { $in: matchData.participantIds },
    });

    if (participants.length !== matchData.participantIds.length) {
      throw new Error("Some participants not found in this tournament");
    }

    let match: Match | null = null;
    if (matchData.pandascoreId) {
      match = await this.matchRepository.findOne({
        pandascoreId: matchData.pandascoreId,
      });
    }

    if (!match) {
      match = new Match();
      match.tournament = tournament;
      match.pandascoreId = matchData.pandascoreId;
      this.em.persist(match);
    }

    match.name = matchData.name;
    match.slug = matchData.slug;
    match.beginAt = matchData.beginAt;
    match.endAt = matchData.endAt;
    match.status = matchData.status;
    match.numberOfGames = matchData.numberOfGames;

    match.participants.removeAll();
    for (const participant of participants) {
      match.participants.add(participant);
    }

    if (matchData.previous_matches && matchData.previous_matches.length > 0) {
      const existingLinks = await this.em.find(BracketLink, { match: match });
      for (const link of existingLinks) {
        this.em.remove(link);
      }

      for (const pm of matchData.previous_matches) {
        const previousMatch = await this.matchRepository.findOne({
          pandascoreId: pm.match_id,
        });

        if (previousMatch) {
          const matchPrevious = new BracketLink();
          matchPrevious.match = match;
          matchPrevious.previousMatch = previousMatch;
          matchPrevious.type = pm.type;
          this.em.persist(matchPrevious);
        }
      }
    }

    if (matchData.results) {
      const existingResults = await this.em.find(MatchResult, { match });
      for (const er of existingResults) {
        this.em.remove(er);
      }

      for (const r of matchData.results) {
        if (!r.participantId) continue;
        const participant = participants.find((p) => p.id === r.participantId);
        if (!participant) continue;

        const mr = new MatchResult();
        mr.match = match;
        mr.participant = participant;
        mr.score = r.score;
        this.em.persist(mr);
      }
    }

    await this.em.flush();

    return match;
  }

  async setMatchWinner(matchId: string, winnerId: string): Promise<Match | null> {
    const match = await this.matchRepository.findOne(
      { id: matchId },
      { populate: ["participants", "winner"] },
    );

    if (!match) {
      throw new Error("Match not found");
    }

    const winner = await this.participantRepository.findOne({ id: winnerId });

    if (!winner) {
      throw new Error("Winner participant not found");
    }

    const isParticipant = match.participants.getItems().some((p) => p.id === winnerId);

    if (!isParticipant) {
      throw new Error("Winner must be a participant in this match");
    }

    match.winner = winner;
    match.status = "finished";

    await this.em.flush();
    return match;
  }

  async getMatchesByPlayer(playerId: string): Promise<Match[]> {
    return this.matchRepository.find(
      {
        participants: {
          players: { id: playerId },
        },
      },
      {
        populate: ["tournament", "participants.team", "participants.players", "winner"],
      },
    );
  }

  async getMatchesByTeam(teamId: string): Promise<Match[]> {
    return this.matchRepository.find(
      {
        participants: {
          team: { id: teamId },
        },
      },
      {
        populate: ["tournament", "participants.team", "participants.players", "winner"],
      },
    );
  }

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    return this.matchRepository.find(
      {
        tournament: { id: tournamentId },
      },
      {
        populate: ["participants.team", "results", "tournament"],
      },
    );
  }
}
