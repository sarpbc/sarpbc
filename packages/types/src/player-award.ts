export const PLAYER_AWARD_TYPES = ["mvp", "defensive_mvp"] as const;

export type PlayerAwardType = (typeof PLAYER_AWARD_TYPES)[number];

export const PlayerAwardTypes = {
  MVP: "mvp",
  DEFENSIVE_MVP: "defensive_mvp",
} as const satisfies Record<string, PlayerAwardType>;

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
