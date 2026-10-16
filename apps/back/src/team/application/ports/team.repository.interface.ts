import { Team } from "../../../player/domain/roster";
import { TeamSearchProps } from "../search-team-props";

export const TEAM_REPOSITORY = Symbol("TEAM_REPOSITORY");

export interface ITeamRepository {
  search(options: Partial<TeamSearchProps>): Promise<Team[]>;
  searchAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]>;
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
  findWithPlayers(id: string): Promise<Team | null>;
  findAllTeams(): Promise<Team[]>;
  save(team: Team): Promise<void>;
  delete(team: Team): Promise<void>;
}
