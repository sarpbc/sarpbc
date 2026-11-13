export const SEASON_AWARD_TYPES = ["season_mvp", "regular_season_mvp", "regional_mvp"] as const;

export type SeasonAwardType = (typeof SEASON_AWARD_TYPES)[number];

export interface SeasonSummary {
  id: string;
  name: string;
}

export interface SeasonInput {
  name: string;
}

export interface SeasonAward {
  id: string;
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
  player: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SeasonDetail extends SeasonSummary {
  awards: SeasonAward[];
}

export interface SeasonAwardInput {
  playerId: string;
  awardType: SeasonAwardType;
  region?: string | null;
  presentedBy?: string | null;
  sourceUrl: string;
}

export interface PlayerSeasonAward {
  id: string;
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
  season: SeasonSummary;
}
