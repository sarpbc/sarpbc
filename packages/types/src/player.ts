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
  /** PandaScore role (e.g. "Coach"); null/undefined for standard players. */
  role?: string | null;
  photos?: string[];
  slug: string;
}
