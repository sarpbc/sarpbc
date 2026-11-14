import { UnprocessableError } from "../../common/domain/errors";
import type { Team } from "../domain/roster";
import type { TeamWriter } from "./ports";

export async function requireTeam(teams: Pick<TeamWriter, "findById">, id: string): Promise<Team> {
  const team = await teams.findById(id);

  if (!team) throw new UnprocessableError(`Team with id "${id}" not found`);

  return team;
}
