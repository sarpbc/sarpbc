import { EntityRepository, type FilterQuery } from "@mikro-orm/core";
import { Tournament } from "./tournament.entities";

export class TournamentRepository extends EntityRepository<Tournament> {
  async findByPandascoreId(pandascoreId: number): Promise<Tournament | null> {
    return this.findOne({ pandascoreId });
  }

  async searchByName({
    name,
    limit = 25,
    offset = 0,
  }: {
    name: string;
    limit?: number;
    offset?: number;
  }): Promise<Tournament[]> {
    const where: FilterQuery<Tournament> = name
      ? {
          $or: [{ name: { $ilike: `%${name}%` } }, { league: { name: { $ilike: `%${name}%` } } }],
        }
      : {};
    return this.find(where, {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: ["league", "event"],
    });
  }

  async findPandascoreWithoutMatches(): Promise<Pick<Tournament, "id" | "name">[]> {
    return this.find(
      {
        source: "pandascore",
        pandascoreId: { $ne: null },
        matches: { $none: {} },
      },
      {
        fields: ["id", "name"],
        orderBy: { beginAt: "DESC" },
      },
    );
  }

  async findPandascoreActive({
    beginsBefore,
    beganAfter,
    endsAfter,
  }: {
    beginsBefore: Date;
    beganAfter: Date;
    endsAfter: Date;
  }): Promise<Pick<Tournament, "id">[]> {
    return this.find(
      {
        source: "pandascore",
        pandascoreId: { $ne: null },
        beginAt: { $lte: beginsBefore, $gte: beganAfter },
        $or: [{ endAt: null }, { endAt: { $gte: endsAfter } }],
      },
      { fields: ["id"] },
    );
  }
}
