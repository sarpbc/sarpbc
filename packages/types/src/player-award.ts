import type { TournamentEventRef } from "./tournament-event";

export type PlayerAwardType = "mvp" | "defensive_mvp";

export interface PlayerProfileAward {
  id: string;
  awardType: PlayerAwardType;
  tournament: {
    id: string;
    name: string;
    slug: string;
    endAt: Date | string | null;
    event: TournamentEventRef;
  };
}

export interface TournamentAwardListItem {
  id: string;
  awardType: PlayerAwardType;
  player: {
    id: string;
    name: string;
    slug: string;
  };
  participant: {
    id: string;
    team?: {
      id: string;
      name: string;
    };
  };
}
