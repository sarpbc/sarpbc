import type { DataSource } from "./competition";
import type { TournamentEventRef } from "./tournament-event";

export type PlayerAwardType =
  | "mvp"
  | "grand_finals_mvp"
  | "offensive_mvp"
  | "defensive_mvp"
  | "breakthrough_player";

export interface PlayerProfileAward {
  id: string;
  awardType: PlayerAwardType;
  tournament: {
    id: string;
    name: string;
    slug: string;
    source: DataSource;
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
