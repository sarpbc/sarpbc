import type { ContractRole } from "./contract";
import type { Team } from "./team";

export interface Player {
  id: string;
  name: string;
  team?: Team;
  birthday?: Date | null;
  nationality?: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  role?: ContractRole | null;
  photos?: string[];
  slug: string;
}
