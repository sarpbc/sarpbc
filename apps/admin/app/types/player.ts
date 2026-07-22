import type { Team } from "./team";

export interface Player {
  id: string;
  name: string;
  team?: Team;
  birthday?: Date;
  nationality?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  /** PandaScore role (e.g. "Coach"); null/undefined for standard players. */
  role?: string | null;
  photos?: string[];
  slug: string;
}
