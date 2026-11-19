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

const buildUpcomingQuery = (todayOnly: boolean) => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return todayOnly ? { beginAt: { $gte: now, $lte: endOfDay } } : { beginAt: { $gte: now } };
};

const buildLiveQuery = (todayOnly: boolean, liveSince?: Date) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const floors = [todayOnly ? startOfDay : null, liveSince ?? null].filter((date) => date !== null);

  const since =
    floors.length > 0 ? new Date(Math.max(...floors.map((date) => date.getTime()))) : null;

  return since
    ? { beginAt: { $gte: since, $lte: now }, endAt: null }
    : { beginAt: { $lte: now }, endAt: null };
};

const buildTournamentFilter = (scope: MatchListScopeFilters) => {
  const { tournamentId, leagueId, redistributableOnly } = scope;
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

  return Object.keys(filter).length > 0 ? filter : undefined;
};

const mergeScopeFilters = (base: MatchListFilter, scope: MatchListScopeFilters) => {
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
        limit,
        offset,
        orderBy: { beginAt: "ASC" } as const,
        where: mergeScopeFilters(buildUpcomingQuery(todayOnly), scope),
      };
    }

    case "live": {
      return {
        limit,
        offset,
        orderBy: { beginAt: "ASC" } as const,
        where: mergeScopeFilters(buildLiveQuery(todayOnly, liveSince), scope),
      };
    }

    case "results": {
      return {
        limit,
        offset,
        orderBy: { endAt: "DESC" } as const,
        where: mergeScopeFilters({ endAt: { $ne: null } }, scope),
      };
    }

    default: {
      const unreachable: never = kind;

      return unreachable;
    }
  }
};

export class MatchRepository extends EntityRepository<Match> {
  async list(kind: MatchListKind, options: MatchListQueryOptions) {
    const { where, orderBy, limit, offset } = listQuery(kind, options);

    return await this.findAll({ limit, offset, orderBy, populate: [...LIST_POPULATE], where });
  }

  async listAndCount(kind: MatchListKind, options: MatchListQueryOptions) {
    const { where, orderBy, limit, offset } = listQuery(kind, options);

    return await this.findAndCount(where, { limit, offset, orderBy, populate: [...LIST_POPULATE] });
  }

  async findByIds(ids: string[]) {
    return await this.findAll({ populate: [...LIST_POPULATE], where: { id: { $in: ids } } });
  }

  async findDetail(ref: EntityRef) {
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
  }) {
    return await this.findAll({
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...FINISHED_POPULATE],
      where: {
        endAt: { $ne: null },
        id: { $ne: excludeMatchId },
        participants: {
          team: { id: teamId },
        },
      },
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
  }) {
    return await this.findAll({
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...FINISHED_POPULATE],
      where: {
        $and: [
          { participants: { team: { id: teamAId } } },
          { participants: { team: { id: teamBId } } },
        ],
        endAt: { $ne: null },
        id: { $ne: excludeMatchId },
      },
    });
  }

  async findRecentlyEnded({ limit, minutesAgo }: { limit: number; minutesAgo: number }) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

    return await this.findAll({
      limit,
      orderBy: { endAt: "DESC" },
      populate: [...LIST_POPULATE],
      where: { endAt: { $gte: cutoffTime, $ne: null } },
    });
  }
}
