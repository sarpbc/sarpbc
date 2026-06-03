import { EntityRepository } from "@mikro-orm/postgresql";
import { Match } from "./match.entity";

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
      populate: ["participants.team", "results"],
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
      populate: ["participants.team", "results", "tournament"],
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
        populate: ["participants.team", "results"],
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
        populate: ["participants.team", "results", "tournament"],
      },
    );
  }
}
