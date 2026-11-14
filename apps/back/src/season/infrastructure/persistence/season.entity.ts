import type { SeasonFormatPhase } from "@sarpbc/types";
import { v4 } from "uuid";
import type { Team } from "../../../roster/infrastructure/roster-persistence";

export class Season {
  id: string = v4();
  declare name: string;
  slug: string | null = null;
  formatSummary: string | null = null;
  formatPhases: SeasonFormatPhase[] = [];
  winnerTeam: Team | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}
