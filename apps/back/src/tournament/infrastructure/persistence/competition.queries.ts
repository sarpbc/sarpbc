import { EntityManager } from "@mikro-orm/postgresql";
import type { FilterQuery } from "@mikro-orm/core";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { League, Match, Tournament, TournamentParticipant } from "./tournament.entities";
import { TournamentRepository } from "./tournament.repository";
import { MatchRepository } from "./match.repository";
import { toLeague, toMatch, toTournament } from "./competition.mapper";
import { TOURNAMENT_POPULATE } from "./tournament-populate";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import { stageFilter } from "./stage-filter";
import type {
  AnniversaryDay,
  TournamentQueries,
  MatchQueries,
  TeamTenure,
} from "../../application/ports";
import type { TournamentListOptions } from "../../application/inputs";
import type {
  MatchListKind,
  MatchListQueryOptions,
} from "../../application/match/match-list-filters";

function onDay(column: string): string {
  return `extract(month from ${column} at time zone ?) = ? AND extract(day from ${column} at time zone ?) = ? AND extract(year from ${column} at time zone ?) < ?`;
}

function terminalBracketMatch(alias: string): string {
  return `EXISTS (SELECT 1 FROM bracket_link fed WHERE fed.match_id = ${alias}.id) AND NOT EXISTS (SELECT 1 FROM bracket_link feeds WHERE feeds.previous_match_id = ${alias}.id)`;
}

const TOURNAMENT_DETAIL_POPULATE = [
  "league",
  "event",
  "winner.team",
  "winner.players",
  "participants.team",
  "participants.players",
  "matches.participants.team",
  "matches.participants.players",
  "matches.previousMatches",
  "matches.results",
  "matches.winner",
] as const;

export class CompetitionQueries implements TournamentQueries, MatchQueries {
  constructor(private readonly em: EntityManager) {}
  async find({
    limit,
    offset = 0,
    ...filters
  }: TournamentListOptions): Promise<[ReturnType<typeof toTournament>[], number]> {
    const [rows, count] = await this.em.findAndCount(Tournament, stageFilter(filters), {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: [
        "league",
        "event",
        "winner.team",
        "winner.players",
        "participants.team",
        "participants.players",
      ],
    });

    return [rows.map(toTournament), count];
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
  async findPandascoreWithoutMatches() {
    return await this.em
      .getRepository<Tournament, TournamentRepository>(Tournament)
      .findPandascoreWithoutMatches();
  }
  async findPandascoreActive(options: { beginsBefore: Date; beganAfter: Date; endsAfter: Date }) {
    return await this.em
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
  async getTournamentsByPlayer(id: string) {
    return await this.tournamentsByParticipants({ players: { id } });
  }
  async getTournamentsByTeam(id: string) {
    return await this.tournamentsByParticipants({ team: { id } });
  }
  async getTournamentsByTeamTenures(tenures: TeamTenure[]) {
    if (tenures.length === 0) return [];

    return await this.tournamentsByParticipants({
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
  async wonOnDay(day: AnniversaryDay) {
    const ids = await this.idsOnDay(
      `SELECT t.id FROM tournament t
       WHERE t.winner_id IS NOT NULL AND ${onDay("t.end_at")}`,
      day,
    );

    if (ids.length === 0) return [];

    return (
      await this.em.find(
        Tournament,
        { id: { $in: ids } },
        {
          populate: ["league", "event", "winner.team", "winner.players"],
          orderBy: { endAt: "DESC" },
        },
      )
    ).map(toTournament);
  }
  async finalsOnDay(day: AnniversaryDay) {
    const ids = await this.idsOnDay(
      `SELECT m.id FROM match m JOIN tournament t ON t.id = m.tournament_id
       WHERE t.has_bracket AND m.winner_id = t.winner_id AND ${onDay("m.end_at")}
         AND ${terminalBracketMatch("m")}
         AND (SELECT count(*) FROM match f
              WHERE f.tournament_id = t.id AND f.winner_id = t.winner_id
                AND ${terminalBracketMatch("f")}) = 1`,
      day,
    );

    if (ids.length === 0) return [];

    return (
      await this.em.find(
        Match,
        { id: { $in: ids } },
        {
          populate: [
            ...MATCH_TOURNAMENT_POPULATE,
            "participants.team",
            "participants.players",
            "results",
            "winner",
          ],
          orderBy: { endAt: "DESC" },
        },
      )
    ).map(toMatch);
  }
  private async idsOnDay(query: string, { month, day, timeZone, beforeYear }: AnniversaryDay) {
    const rows: { id: string }[] = await this.em
      .getConnection()
      .execute(query, [timeZone, month, timeZone, day, timeZone, beforeYear]);

    return rows.map(({ id }) => id);
  }
  async list(
    kind: MatchListKind,
    options: MatchListQueryOptions,
  ): Promise<[ReturnType<typeof toMatch>[], number]> {
    const [rows, count] = await this.em
      .getRepository<Match, MatchRepository>(Match)
      .listAndCount(kind, options);

    return [rows.map(toMatch), count];
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
        populate: [
          ...MATCH_TOURNAMENT_POPULATE,
          "participants.team",
          "participants.players",
          "results",
          "winner",
        ],
      })
    ).map(toMatch);
  }
  async byPlayer(id: string) {
    return await this.matchesBy({ participants: { players: { id } } });
  }
  async byTeam(id: string) {
    return await this.matchesBy({ participants: { team: { id } } });
  }
  async byTournament(id: string) {
    return (
      await this.em.find(
        Match,
        { tournament: { id } },
        {
          orderBy: { beginAt: "ASC" },
          populate: [
            ...MATCH_TOURNAMENT_POPULATE,
            "participants.team",
            "participants.players",
            "results",
            "winner.team",
            "winner.players",
          ],
        },
      )
    ).map(toMatch);
  }
}
