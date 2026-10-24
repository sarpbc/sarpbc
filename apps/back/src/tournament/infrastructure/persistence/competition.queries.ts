import { EntityManager } from "@mikro-orm/postgresql";
import type { FilterQuery } from "@mikro-orm/core";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { League, Match, Tournament, TournamentParticipant } from "./tournament.entities";
import { TournamentRepository } from "./tournament.repository";
import { MatchRepository } from "./match.repository";
import { toLeague, toMatch, toTournament } from "./competition.mapper";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import type { TournamentQueries, MatchQueries } from "../../application/ports";
import type { TournamentListOptions } from "../../application/inputs";
import type { MatchListQueryOptions } from "../../application/match/match-list-filters";
export const TOURNAMENT_DETAIL_POPULATE = [
  "league",
  "event",
  "winner.team",
  "participants.team",
  "participants.players",
  "matches.participants.team",
  "matches.previousMatches",
  "matches.results",
  "matches.winner",
] as const;
interface StageFilter {
  pickemsEnabled?: boolean;
  source?: { $ne: "startgg" };
  winner?: null;
  $or?: [{ endAt: null }, { endAt: { $gt: Date } }];
}
export function stageFilter({
  pickems,
  activeOnly = false,
  redistributableOnly = false,
}: Pick<TournamentListOptions, "pickems" | "activeOnly" | "redistributableOnly">): StageFilter {
  const where: StageFilter = {};
  if (pickems !== undefined) where.pickemsEnabled = pickems;
  if (redistributableOnly) where.source = { $ne: "startgg" };
  if (activeOnly) {
    where.winner = null;
    where.$or = [{ endAt: null }, { endAt: { $gt: new Date() } }];
  }
  return where;
}
export class CompetitionQueries implements TournamentQueries, MatchQueries {
  constructor(private readonly em: EntityManager) {}
  async find({ limit = 20, offset = 0, ...filters }: TournamentListOptions) {
    const [rows, count] = await this.em.findAndCount(Tournament, stageFilter(filters), {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: ["league", "event", "winner.team", "participants.team"],
    });
    return [rows.map(toTournament), count] as [ReturnType<typeof toTournament>[], number];
  }
  async searchByName(options: { name: string; limit?: number; offset?: number }) {
    return (
      await this.em
        .getRepository<Tournament, TournamentRepository>(Tournament)
        .searchByName(options)
    ).map(toTournament);
  }
  async findById(id: string) {
    const row = await this.em.findOne(
      Tournament,
      { id },
      { populate: [...TOURNAMENT_DETAIL_POPULATE] },
    );
    return row ? toTournament(row) : null;
  }
  async findByPandascoreId(id: number) {
    const row = await this.em.findOne(
      Tournament,
      { pandascoreId: id },
      {
        populate: ["league", "event", "winner.team", "participants.team", "participants.players"],
      },
    );
    return row ? toTournament(row) : null;
  }
  findPandascoreWithoutMatches() {
    return this.em
      .getRepository<Tournament, TournamentRepository>(Tournament)
      .findPandascoreWithoutMatches();
  }
  findPandascoreActive(options: { beginsBefore: Date; beganAfter: Date; endsAfter: Date }) {
    return this.em
      .getRepository<Tournament, TournamentRepository>(Tournament)
      .findPandascoreActive(options);
  }
  async knownPandascoreIds() {
    const rows = await this.em.find(
      Tournament,
      { pandascoreId: { $ne: null } },
      { fields: ["pandascoreId"] },
    );
    return new Set(rows.flatMap((r) => (r.pandascoreId === null ? [] : [r.pandascoreId])));
  }
  async leagues({ limit = 20, offset = 0 }: { limit?: number; offset?: number }) {
    return (await this.em.find(League, {}, { limit, offset, orderBy: { name: "ASC" } })).map(
      toLeague,
    );
  }
  private async tournamentsByParticipants(where: FilterQuery<TournamentParticipant>) {
    const participants = await this.em.find(TournamentParticipant, where, {
      populate: [
        "tournament.league",
        "tournament.event",
        "tournament.winner.team",
        "tournament.winner.players",
      ],
    });
    return [
      ...new Map(participants.map((p) => [p.tournament.id, toTournament(p.tournament)])).values(),
    ];
  }
  getTournamentsByPlayer(id: string) {
    return this.tournamentsByParticipants({ players: { id } });
  }
  getTournamentsByTeam(id: string) {
    return this.tournamentsByParticipants({ team: { id } });
  }
  async getTournamentsWonByPlayer(id: string) {
    return (
      await this.em.find(
        Tournament,
        { winner: { players: { id } } },
        {
          populate: ["league", "event", "winner.team", "winner.players"],
          orderBy: { endAt: "DESC" },
        },
      )
    ).map(toTournament);
  }
  async getTournamentsWonByTeam(id: string) {
    return (
      await this.em.find(
        Tournament,
        { winner: { team: { id } } },
        {
          populate: ["league", "event", "winner.team", "winner.players"],
          orderBy: { endAt: "DESC" },
        },
      )
    ).map(toTournament);
  }
  async list(kind: "upcoming" | "live" | "results", options: MatchListQueryOptions) {
    const repo = this.em.getRepository<Match, MatchRepository>(Match);
    const [rows, count] = await (kind === "upcoming"
      ? repo.findUpcomingAndCount(options)
      : kind === "live"
        ? repo.findLiveAndCount(options)
        : repo.findResultsAndCount(options));
    return [rows.map(toMatch), count] as [ReturnType<typeof toMatch>[], number];
  }
  async recentlyEnded(options: { limit?: number; minutesAgo?: number }) {
    return (
      await this.em.getRepository<Match, MatchRepository>(Match).findRecentlyEnded(options)
    ).map(toMatch);
  }
  async detail(ref: EntityRef) {
    const row = await this.em.getRepository<Match, MatchRepository>(Match).findDetail(ref);
    return row ? toMatch(row) : null;
  }
  async recentByTeam(options: { teamId: string; excludeMatchId: string; limit: number }) {
    return (
      await this.em.getRepository<Match, MatchRepository>(Match).findRecentFinishedByTeamId(options)
    ).map(toMatch);
  }
  async betweenTeams(options: {
    teamAId: string;
    teamBId: string;
    excludeMatchId: string;
    limit: number;
  }) {
    return (
      await this.em.getRepository<Match, MatchRepository>(Match).findFinishedBetweenTeams(options)
    ).map(toMatch);
  }
  private async matchesBy(where: FilterQuery<Match>) {
    return (
      await this.em.find(Match, where, {
        orderBy: { beginAt: "ASC" },
        populate: [...MATCH_TOURNAMENT_POPULATE, "participants.team", "results", "winner"],
      })
    ).map(toMatch);
  }
  byPlayer(id: string) {
    return this.matchesBy({ participants: { players: { id } } });
  }
  byTeam(id: string) {
    return this.matchesBy({ participants: { team: { id } } });
  }
  async byTournament(id: string) {
    return (
      await this.em.find(
        Match,
        { tournament: { id } },
        {
          orderBy: { beginAt: "ASC" },
          populate: [...MATCH_TOURNAMENT_POPULATE, "participants.team", "results", "winner.team"],
        },
      )
    ).map(toMatch);
  }
}
