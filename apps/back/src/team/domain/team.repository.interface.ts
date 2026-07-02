import { Team } from "../../player/player.entities";
import { TeamSearchProps } from "../interfaces/search-team-props";

export interface ITeamRepository {
  search(options: Partial<TeamSearchProps>): Promise<Team[]>;
  searchAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]>;
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
  findWithPlayers(id: string): Promise<Team | null>;
  findAllTeams(): Promise<Team[]>;
  save(team: Team): Promise<void>;
  saveMany(teams: Team[]): Promise<void>;
  flush(): Promise<void>;
}
