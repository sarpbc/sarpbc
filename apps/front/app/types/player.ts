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
  photos?: string[];
  slug: string;
}
