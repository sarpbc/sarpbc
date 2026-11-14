import type { ContractRole } from "@sarpbc/types";
import type { Team } from "./team.entity";
import type { Player } from "./player.entity";

export class Contract {
  id!: string;
  player!: Player;
  team!: Team;
  startDate!: Date;
  endDate: Date | null = null;
  role: ContractRole = "active";
  joinSourceUrl: string | null = null;
  leaveSourceUrl: string | null = null;
  createdAt = new Date();
}
