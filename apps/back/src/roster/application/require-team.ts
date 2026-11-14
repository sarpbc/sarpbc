import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import type { Team } from "../domain/team";
import type { TeamWriter } from "./ports";

export const requireTeam = async (
  teams: Pick<TeamWriter, "findById">,
  id: string,
): Promise<Team> => {
  const team = await teams.findById(id);

  if (!team) {
    throw new UnprocessableError(`Team with id "${id}" not found`);
  }

  return team;
};
