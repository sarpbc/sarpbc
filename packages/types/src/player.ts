import type { DataSource } from "./competition";
import type { ContractRole } from "./contract";
import type { TeamSummary } from "./team";

export const PLAYER_STATUSES = ["active", "free_agent", "retired"] as const;

export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export interface Player {
  id: string;
  name: string;
  slug: string;
  birthday: string | null;
  nationality: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: ContractRole | null;
  source: DataSource;
  team: TeamSummary | null;
  photos?: string[];
}
