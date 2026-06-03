import { EntityRepository } from "@mikro-orm/postgresql";
import { Tournament } from "./domain/tournament.entity";

export class TournamentRepository extends EntityRepository<Tournament> {
  async findByPandascoreId(pandascoreId: number): Promise<Tournament | null> {
    return this.findOne({ pandascoreId });
  }

  async findAllTournaments(fields?: string[]): Promise<Tournament[]> {
    const opts: any = {};
    if (fields) opts.fields = fields;
    return super.findAll(opts);
  }
}
