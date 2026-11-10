import { EntityManager } from "@mikro-orm/postgresql";
import type { FilterQuery } from "@mikro-orm/core";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { League, Match, Tournament, TournamentParticipant } from "./tournament.entities";
import { TournamentRepository } from "./tournament.repository";
import { MatchRepository } from "./match.repository";
import { TOURNAMENT_POPULATE, toLeague, toMatch, toTournament } from "./competition.mapper";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import { stageFilter } from "./stage-filter";
import type { TournamentQueries, MatchQueries, TeamTenure } from "../../application/ports";
import type { TournamentListOptions } from "../../application/inputs";
import type {
  MatchListKind,
  MatchListQueryOptions,
} from "../../application/match/match-list-filters";
const TOURNAMENT_DETAIL_POPULATE = [
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
export class CompetitionQueries implements TournamentQueries, MatchQueries {
  constructor(private readonly em: EntityManager) {}
  async find({ limit, offset = 0, ...filters }: TournamentListOptions) {
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
      { populate: [...TOURNAMENT_POPULATE] },
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
  async leagues({ limit, offset = 0 }: { limit: number; offset?: number }) {
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
  async getTournamentsByTeamTenures(tenures: TeamTenure[]) {
    if (tenures.length === 0) return [];
    return this.tournamentsByParticipants({
      $or: tenures.map(({ teamId, from, to }) => ({
        team: { id: teamId },
        tournament: { beginAt: to ? { $gte: from, $lte: to } : { $gte: from } },
      })),
    });
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
  async list(kind: MatchListKind, options: MatchListQueryOptions) {
    const [rows, count] = await this.em
      .getRepository<Match, MatchRepository>(Match)
      .listAndCount(kind, options);
    return [rows.map(toMatch), count] as [ReturnType<typeof toMatch>[], number];
  }
  async page(kind: MatchListKind, options: MatchListQueryOptions) {
    return (await this.em.getRepository<Match, MatchRepository>(Match).list(kind, options)).map(
      toMatch,
    );
  }
  async byIds(ids: string[]) {
    return (await this.em.getRepository<Match, MatchRepository>(Match).findByIds(ids)).map(toMatch);
  }
  async recentlyEnded(options: { limit: number; minutesAgo: number }) {
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
