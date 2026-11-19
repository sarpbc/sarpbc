import { EntityRepository } from "@mikro-orm/core";
import type { FilterQuery } from "@mikro-orm/core";
import { Tournament } from "./tournament.entity";
import { TOURNAMENT_POPULATE } from "./tournament-populate";

export class TournamentRepository extends EntityRepository<Tournament> {
  async searchByName({
    name,
    limit = 25,
    offset = 0,
  }: {
    name: string;
    limit?: number;
    offset?: number;
  }) {
    const where: FilterQuery<Tournament> = name
      ? {
          $or: [{ name: { $ilike: `%${name}%` } }, { league: { name: { $ilike: `%${name}%` } } }],
        }
      : {};

    return await this.findAll({
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: [...TOURNAMENT_POPULATE],
      where,
    });
  }

  async findPandascoreWithoutMatches() {
    return await this.findAll({
      fields: ["id", "name"],
      orderBy: { beginAt: "DESC" },
      where: {
        matches: { $none: {} },
        pandascoreId: { $ne: null },
        source: "pandascore",
      },
    });
  }

  async findPandascoreActive({
    beginsBefore,
    beganAfter,
    endsAfter,
  }: {
    beginsBefore: Date;
    beganAfter: Date;
    endsAfter: Date;
  }) {
    return await this.findAll({
      fields: ["id"],
      where: {
        $or: [{ endAt: null }, { endAt: { $gte: endsAfter } }],
        beginAt: { $gte: beganAfter, $lte: beginsBefore },
        pandascoreId: { $ne: null },
        source: "pandascore",
      },
    });
  }
}
