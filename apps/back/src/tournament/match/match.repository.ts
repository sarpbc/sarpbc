import { EntityRepository, FilterQuery } from "@mikro-orm/postgresql";
import { Match } from "./match.entity";

const LIST_POPULATE = ["participants.team", "results", "tournament", "tournament.league"] as const;

const DETAIL_POPULATE = [
  "participants.team",
  "participants.players",
  "results",
  "results.participant",
  "winner",
  "winner.team",
  "tournament",
  "tournament.league",
] as const;

const TEAM_FORM_POPULATE = [
  "participants.team",
  "results",
  "results.participant",
  "winner",
  "winner.team",
] as const;

export class MatchRepository extends EntityRepository<Match> {
  async findByPandascoreId(pandascoreId: number): Promise<Match | null> {
    return this.findOne({ pandascoreId });
  }

  async findUpcoming({
    limit = 20,
    offset = 0,
    todayOnly = false,
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<Match[]> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = todayOnly
      ? { beginAt: { $gte: now, $lte: endOfDay } }
      : { beginAt: { $gte: now } };

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
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<[Match[], number]> {
    const query = this.buildUpcomingQuery(todayOnly);
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
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<Match[]> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const query: any = todayOnly
      ? { beginAt: { $lte: now, $gte: startOfDay }, endAt: null }
      : { beginAt: { $lte: now }, endAt: null };

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
  }: {
    limit?: number;
    offset?: number;
    todayOnly?: boolean;
  }): Promise<[Match[], number]> {
    const query = this.buildLiveQuery(todayOnly);
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
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Match[]> {
    return this.find(
      { endAt: { $ne: null } },
      {
        limit,
        offset,
        orderBy: { endAt: "DESC" },
        populate: [...LIST_POPULATE],
      },
    );
  }

  async findResultsAndCount({
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<[Match[], number]> {
    return this.findAndCount(
      { endAt: { $ne: null } },
      {
        limit,
        offset,
        orderBy: { endAt: "DESC" },
        populate: [...LIST_POPULATE],
      },
    );
  }

  async findDetailById(id: string): Promise<Match | null> {
    return this.findOne({ id }, { populate: [...DETAIL_POPULATE] });
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

  private buildUpcomingQuery(todayOnly: boolean): FilterQuery<Match> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return todayOnly ? { beginAt: { $gte: now, $lte: endOfDay } } : { beginAt: { $gte: now } };
  }

  private buildLiveQuery(todayOnly: boolean): FilterQuery<Match> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return todayOnly
      ? { beginAt: { $lte: now, $gte: startOfDay }, endAt: null }
      : { beginAt: { $lte: now }, endAt: null };
  }
}
