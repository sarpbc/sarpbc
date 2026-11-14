import { v4 } from "uuid";
import type { Team } from "../../../roster/infrastructure/roster-persistence";
import type { CircuitStage } from "./circuit-stage.entity";

export class CircuitStageTeam {
  id: string = v4();
  declare stage: CircuitStage;
  declare team: Team;
  placement: number | null = null;
  regionMember = false;
}
