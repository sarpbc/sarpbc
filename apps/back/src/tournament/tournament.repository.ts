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
      populate: ["league"],
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

  async findAllTournaments(fields?: string[]): Promise<Tournament[]> {
    const opts: any = {};
    if (fields) opts.fields = fields;
    return super.findAll(opts);
  }
}
