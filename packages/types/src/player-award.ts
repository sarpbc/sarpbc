export type PlayerAwardType = "mvp" | "defensive_mvp";

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
