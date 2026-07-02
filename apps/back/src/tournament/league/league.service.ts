import { Injectable } from "@nestjs/common";
import { League } from "../tournament.entities";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { InjectRepository } from "@mikro-orm/nestjs";

@Injectable()
export class LeagueService {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: EntityRepository<League>,
    private readonly em: EntityManager,
  ) {}

  async upsertLeague(pandaLeague: any): Promise<League> {
    let league = await this.leagueRepository.findOne({
      pandascoreId: pandaLeague.id,
    });

    if (!league) {
      league = new League();
      league.pandascoreId = pandaLeague.id;
      league.name = pandaLeague.name;
      league.slug = pandaLeague.slug;
      league.url = pandaLeague.url;
      league.imageUrl = pandaLeague.image_url;
      league.modifiedAt = pandaLeague.modified_at ? new Date(pandaLeague.modified_at) : null;

      await this.em.persist(league).flush();
    } else {
      league.name = pandaLeague.name;
      league.slug = pandaLeague.slug;
      league.url = pandaLeague.url;
      league.imageUrl = pandaLeague.image_url;
      league.modifiedAt = pandaLeague.modified_at ? new Date(pandaLeague.modified_at) : null;
    }

    return league;
  }

  async findById(id: string): Promise<League | null> {
    return this.leagueRepository.findOne({ id });
  }

  async findByPandascoreId(pandascoreId: number): Promise<League | null> {
    return this.leagueRepository.findOne({ pandascoreId });
  }

  async find({ limit = 20, offset = 0 }: { limit?: number; offset?: number }): Promise<League[]> {
    return this.leagueRepository.find({}, { limit, offset, orderBy: { name: "ASC" } });
  }
}
