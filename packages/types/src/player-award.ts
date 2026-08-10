export enum PlayerAwardType {
  MVP = "mvp",
}

/** Award row for a player profile (tournament context). */
export interface PlayerProfileAward {
  id: string;
  awardType: PlayerAwardType;
  tournament: {
    id: string;
    name: string;
    endAt: Date | string | null;
    serie?: string | null;
    leagueName?: string;
  };
}

/** Award row for tournament admin (player + roster team context). */
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
