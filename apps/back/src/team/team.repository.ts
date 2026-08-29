import { EntityRepository } from "@mikro-orm/core";
import type { Team } from "../player/player.entities";
import { ITeamRepository } from "./domain/team.repository.interface";
import { TeamSearchProps } from "./interfaces/search-team-props";

interface TeamNameFilter {
  name?: { $ilike: string };
}

export class TeamRepository extends EntityRepository<Team> implements ITeamRepository {
  async search({ name, limit = 25, offset = 0 }: Partial<TeamSearchProps>): Promise<Team[]> {
    const where: TeamNameFilter = {};
    if (name) {
      where.name = { $ilike: `%${name}%` };
    }
    return this.find(where, { limit, offset, orderBy: { name: "asc" } });
  }

  async searchAndCount({
    name,
    start,
    limit = 25,
    offset = 0,
  }: Partial<TeamSearchProps>): Promise<[Team[], number]> {
    const where: TeamNameFilter = {};
    if (start) {
      where.name = { $ilike: `${start}%` };
    }
    if (name) {
      where.name = { $ilike: `%${name}%` };
    }
    return this.findAndCount(where, {
      limit,
      offset,
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<Team | null> {
    return this.findOne({ id });
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.findOne({ slug }, { populate: ["players"] });
  }

  async findWithPlayers(id: string): Promise<Team | null> {
    return this.findOne({ id }, { populate: ["players"] });
  }

  async findAllTeams(): Promise<Team[]> {
    return super.findAll();
  }

  async save(team: Team): Promise<void> {
    await this.em.persist(team).flush();
  }

  async saveMany(teams: Team[]): Promise<void> {
    for (const team of teams) {
      this.em.persist(team);
    }
    await this.em.flush();
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  persist(team: Team): void {
    this.em.persist(team);
  }

  async delete(team: Team): Promise<void> {
    await this.em.remove(team).flush();
  }
}
