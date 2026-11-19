import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import type { TeamWriter } from "./ports";

export const requireTeam = async (teams: Pick<TeamWriter, "findById">, id: string) => {
  const team = await teams.findById(id);

  if (!team) {
    throw new UnprocessableError(`Team with id "${id}" not found`);
  }

  return team;
};
