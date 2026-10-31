import { EntityRepository } from "@mikro-orm/core";
import type { DataSource } from "../../../common/domain/data-source";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { Match } from "./tournament.entities";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import type {
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
  participants?: { team: { id: string } };
  source?: { $ne: DataSource };
}

const LIST_POPULATE = ["participants.team", "results", ...MATCH_TOURNAMENT_POPULATE] as const;

const DETAIL_POPULATE = [
  "participants.team",
  "participants.players",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

const TEAM_FORM_POPULATE = [
  "participants.team",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

const HEAD_TO_HEAD_POPULATE = [
  "participants.team",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  ...MATCH_TOURNAMENT_POPULATE,
] as const;

export class MatchRepository extends EntityRepository<Match> {
  async findByPandascoreId(pandascoreId: number): Promise<Match | null> {
    return this.findOne({ pandascoreId });
  }

  async findUpcoming({
    limit = 20,
    offset = 0,
    todayOnly = false,
    tournamentId,
    leagueId,
    teamId,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<Match[]> {
    const query = this.mergeScopeFilters(this.buildUpcomingQuery(todayOnly), {
      tournamentId,
      leagueId,
      teamId,
      redistributableOnly,
    });

    return this.find(query, {
      limit,
      offset,
      orderBy: { beginAt: "ASC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findUpcomingAndCount({
    limit = 20,
    offset = 0,
    todayOnly = false,
    tournamentId,
    leagueId,
    teamId,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<[Match[], number]> {
    const query = this.mergeScopeFilters(this.buildUpcomingQuery(todayOnly), {
      tournamentId,
      leagueId,
      teamId,
      redistributableOnly,
    });
    return this.findAndCount(query, {
      limit,
      offset,
      orderBy: { beginAt: "ASC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findLive({
    limit = 20,
    offset = 0,
    todayOnly = false,
    tournamentId,
    leagueId,
    teamId,
    liveSince,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<Match[]> {
    const query = this.mergeScopeFilters(this.buildLiveQuery(todayOnly, liveSince), {
      tournamentId,
      leagueId,
      teamId,
      redistributableOnly,
    });

    return this.find(query, {
      limit,
      offset,
      orderBy: { beginAt: "ASC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findLiveAndCount({
    limit = 20,
    offset = 0,
    todayOnly = false,
    tournamentId,
    leagueId,
    teamId,
    liveSince,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<[Match[], number]> {
    const query = this.mergeScopeFilters(this.buildLiveQuery(todayOnly, liveSince), {
      tournamentId,
      leagueId,
      teamId,
      redistributableOnly,
    });
    return this.findAndCount(query, {
      limit,
      offset,
      orderBy: { beginAt: "ASC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findResults({
    limit = 20,
    offset = 0,
    tournamentId,
    leagueId,
    teamId,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<Match[]> {
    const query = this.mergeScopeFilters(
      { endAt: { $ne: null } },
      {
        tournamentId,
        leagueId,
        teamId,
        redistributableOnly,
      },
    );

    return this.find(query, {
      limit,
      offset,
      orderBy: { endAt: "DESC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findResultsAndCount({
    limit = 20,
    offset = 0,
    tournamentId,
    leagueId,
    teamId,
    redistributableOnly,
  }: MatchListQueryOptions): Promise<[Match[], number]> {
    const query = this.mergeScopeFilters(
      { endAt: { $ne: null } },
      {
        tournamentId,
        leagueId,
        teamId,
        redistributableOnly,
      },
    );

    return this.findAndCount(query, {
      limit,
      offset,
      orderBy: { endAt: "DESC" },
      populate: [...LIST_POPULATE],
    });
  }

  async findByIds(ids: string[]): Promise<Match[]> {
    return this.find({ id: { $in: ids } }, { populate: [...LIST_POPULATE] });
  }

  async findDetail(ref: EntityRef): Promise<Match | null> {
    const where = ref.kind === "publicId" ? { publicId: ref.value } : { id: ref.value };
    return this.findOne(where, { populate: [...DETAIL_POPULATE] });
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
    return this.find(
      {
        id: { $ne: excludeMatchId },
        endAt: { $ne: null },
        participants: {
          team: { id: teamId },
        },
      },
      {
        limit,
        orderBy: { endAt: "DESC" },
        populate: [...TEAM_FORM_POPULATE],
      },
    );
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
    return this.find(
      {
        id: { $ne: excludeMatchId },
        endAt: { $ne: null },
        $and: [
          { participants: { team: { id: teamAId } } },
          { participants: { team: { id: teamBId } } },
        ],
      },
      {
        limit,
        orderBy: { endAt: "DESC" },
        populate: [...HEAD_TO_HEAD_POPULATE],
      },
    );
  }

  async findRecentlyEnded({
    limit = 100,
    minutesAgo = 15,
  }: {
    limit?: number;
    minutesAgo?: number;
  }): Promise<Match[]> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

    return this.find(
      { endAt: { $ne: null, $gte: cutoffTime } },
      {
        limit,
        orderBy: { endAt: "DESC" },
        populate: [...LIST_POPULATE],
      },
    );
  }

  private buildUpcomingQuery(todayOnly: boolean): MatchListFilter {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return todayOnly ? { beginAt: { $gte: now, $lte: endOfDay } } : { beginAt: { $gte: now } };
  }

  private buildLiveQuery(todayOnly: boolean, liveSince?: Date): MatchListFilter {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const floors = [todayOnly ? startOfDay : null, liveSince ?? null].filter(
      (date) => date !== null,
    );
    const since =
      floors.length > 0 ? new Date(Math.max(...floors.map((date) => date.getTime()))) : null;

    return since
      ? { beginAt: { $lte: now, $gte: since }, endAt: null }
      : { beginAt: { $lte: now }, endAt: null };
  }

  private mergeScopeFilters(base: MatchListFilter, scope: MatchListScopeFilters): MatchListFilter {
    const query: MatchListFilter = { ...base };
    const tournamentFilter = this.buildTournamentFilter(scope);
    if (tournamentFilter) query.tournament = tournamentFilter;
    if (scope.teamId) query.participants = { team: { id: scope.teamId } };
    if (scope.redistributableOnly) {
      query.source = { $ne: "startgg" };
    }
    return query;
  }

  private buildTournamentFilter(
    scope: MatchListScopeFilters,
  ): MatchTournamentScopeFilter | undefined {
    const { tournamentId, leagueId, redistributableOnly } = scope;
    if (!tournamentId && !leagueId && !redistributableOnly) {
      return undefined;
    }

    const filter: MatchTournamentScopeFilter = {};
    if (tournamentId) {
      filter.id = tournamentId;
    }
    if (leagueId) {
      filter.league = { id: leagueId };
    }
    if (redistributableOnly) {
      filter.source = { $ne: "startgg" };
    }

    return filter;
  }
}
