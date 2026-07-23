import type { Player } from "./player";

export interface Team {
  id: string;
  name: string;
  players: Player[];
  location?: string;
  imageUrl?: string;
  slug: string;
}
