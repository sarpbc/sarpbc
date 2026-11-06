import type { TournamentEventRef } from "@sarpbc/types";

export interface Tournament {
  id: string;
  name: string;
  event: TournamentEventRef;
  imageUrl: string | null;
}
