import { EntityRepository } from "@mikro-orm/core";
import type { DataSource } from "@sarpbc/types";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { Match } from "./match.entity";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import type {
  MatchListKind,
  MatchListQueryOptions,
  MatchListScopeFilters,
} from "../../application/match/match-list-filters";

interface MatchTournamentScopeFilter {
  id?: string;
  league?: { id: string };
  source?: { $ne: DataSource };
}

interface MatchListFilter {
  beginAt?: { $gte?: Date; $lte?: Date };
  endAt?: null | { $ne: null };
  tournament?: MatchTournamentScopeFilter;
  participants?: { team?: { id: string }; players?: { id: { $in: string[] } } };
  source?: { $ne: DataSource };
}

const LIST_POPULATE = [
  "participants.team",
  "participants.players",
  "results",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

const DETAIL_POPULATE = [
  "participants.team",
  "participants.players",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  "winner.players",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

const FINISHED_POPULATE = [
  "participants.team",
  "participants.players",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  "winner.players",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

const buildUpcomingQuery = (todayOnly: boolean): MatchListFilter => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return todayOnly ? { beginAt: { $gte: now, $lte: endOfDay } } : { beginAt: { $gte: now } };
};

const buildLiveQuery = (todayOnly: boolean, liveSince?: Date): MatchListFilter => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const floors = [todayOnly ? startOfDay : null, liveSince ?? null].filter((date) => date !== null);

  const since =
    floors.length > 0 ? new Date(Math.max(...floors.map((date) => date.getTime()))) : null;

  return since
    ? { beginAt: { $lte: now, $gte: since }, endAt: null }
    : { beginAt: { $lte: now }, endAt: null };
};

const buildTournamentFilter = (
  scope: MatchListScopeFilters,
): MatchTournamentScopeFilter | undefined => {
  const { tournamentId, leagueId, redistributableOnly } = scope;

  if (
    (tournamentId === undefined || tournamentId === "") &&
    (leagueId === undefined || leagueId === "") &&
    redistributableOnly !== true
  ) {
    return undefined;
  }

  const filter: MatchTournamentScopeFilter = {};

  if (tournamentId !== undefined && tournamentId !== "") {
    filter.id = tournamentId;
  }

  if (leagueId !== undefined && leagueId !== "") {
    filter.league = { id: leagueId };
  }

  if (redistributableOnly === true) {
    filter.source = { $ne: "startgg" };
  }

  return filter;
};

const mergeScopeFilters = (
  base: MatchListFilter,
  scope: MatchListScopeFilters,
): MatchListFilter => {
  const query: MatchListFilter = { ...base };
  const tournamentFilter = buildTournamentFilter(scope);

  if (tournamentFilter) {
    query.tournament = tournamentFilter;
  }

  if ((scope.teamId !== undefined && scope.teamId !== "") || scope.playerIds) {
    query.participants = {
      ...(scope.teamId !== undefined && scope.teamId !== "" && { team: { id: scope.teamId } }),
      ...(scope.playerIds && { players: { id: { $in: scope.playerIds } } }),
    };
  }

  if (scope.redistributableOnly === true) {
    query.source = { $ne: "startgg" };
  }

  return query;
};

const listQuery = (
  kind: MatchListKind,
  { limit, offset = 0, todayOnly = false, liveSince, ...scope }: MatchListQueryOptions,
) => {
  switch (kind) {
    case "upcoming": {
      return {
        where: mergeScopeFilters(buildUpcomingQuery(todayOnly), scope),
        orderBy: { beginAt: "ASC" } as const,
        limit,
        offset,
      };
    }

    case "live": {
      return {
        where: mergeScopeFilters(buildLiveQuery(todayOnly, liveSince), scope),
        orderBy: { beginAt: "ASC" } as const,
        limit,
        offset,
      };
    }

    case "results": {
      return {
        where: mergeScopeFilters({ endAt: { $ne: null } }, scope),
        orderBy: { endAt: "DESC" } as const,
        limit,
        offset,
      };
    }

    default: {
      const unreachable: never = kind;

      return unreachable;
    }
  }
};

export class MatchRepository extends EntityRepository<Match> {
  async list(kind: MatchListKind, options: MatchListQueryOptions): Promise<Match[]> {
    const { where, orderBy, limit, offset } = listQuery(kind, options);

    return await this.findAll({ where, limit, offset, orderBy, populate: [...LIST_POPULATE] });
  }

  async listAndCount(
    kind: MatchListKind,
    options: MatchListQueryOptions,
  ): Promise<[Match[], number]> {
    const { where, orderBy, limit, offset } = listQuery(kind, options);

    return await this.findAndCount(where, { limit, offset, orderBy, populate: [...LIST_POPULATE] });
  }

  async findByIds(ids: string[]): Promise<Match[]> {
    return await this.findAll({ where: { id: { $in: ids } }, populate: [...LIST_POPULATE] });
  }

  async findDetail(ref: EntityRef): Promise<Match | null> {
    const where = ref.kind === "publicId" ? { publicId: ref.value } : { id: ref.value };

    return await this.findOne(where, { populate: [...DETAIL_POPULATE] });
  }

  async findRecentFinishedByTeamId({
    teamId,
    excludeMatchId,
    limit = 5,
  }: {
    teamId: string;
    excludeMatchId: string;
    limit?: number;
  }): Promise<Match[]> {
    return await this.findAll({
      where: {
        id: { $ne: excludeMatchId },
        endAt: { $ne: null },
        participants: {
          team: { id: teamId },
        },
      },
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...FINISHED_POPULATE],
    });
  }

  async findFinishedBetweenTeams({
    teamAId,
    teamBId,
    excludeMatchId,
    limit = 20,
  }: {
    teamAId: string;
    teamBId: string;
    excludeMatchId: string;
    limit?: number;
  }): Promise<Match[]> {
    return await this.findAll({
      where: {
        id: { $ne: excludeMatchId },
        endAt: { $ne: null },
        $and: [
          { participants: { team: { id: teamAId } } },
          { participants: { team: { id: teamBId } } },
        ],
      },
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...FINISHED_POPULATE],
    });
  }

  async findRecentlyEnded({
    limit,
    minutesAgo,
  }: {
    limit: number;
    minutesAgo: number;
  }): Promise<Match[]> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

    return await this.findAll({
      where: { endAt: { $ne: null, $gte: cutoffTime } },
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...LIST_POPULATE],
    });
  }
}
