export const CAREER_REGIONS = ["na", "eu", "oce", "sam", "ssa", "mena", "apac"] as const;
export type CareerRegion = (typeof CAREER_REGIONS)[number];

export const CAREER_ROLES = ["striker", "mid", "def", "goalie"] as const;
export type CareerRole = (typeof CAREER_ROLES)[number];

export const CAREER_BACKGROUNDS = ["prodigy", "grinder", "wildcard"] as const;
export type CareerBackground = (typeof CAREER_BACKGROUNDS)[number];

export interface CareerStats {
  rating: number;
  form: number;
  morale: number;
}

export type CareerPhase =
  | "onboarding"
  | "season_intro"
  | "event"
  | "match"
  | "offseason"
  | "career_end";

export type OnboardingStep = "intro" | "region" | "role" | "background";

export interface CareerEventChoiceDefinition {
  id: string;
  delta: Partial<CareerStats>;
}

export interface CareerEventDefinition {
  id: string;
  season: number;
  choices: CareerEventChoiceDefinition[];
}

export interface CareerMatchResult {
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  won: boolean;
  stage: string;
}

export interface CareerSeasonRecord {
  season: number;
  team: string;
  placement: string;
  matches: CareerMatchResult[];
  ratingEnd: number;
}

export interface CareerResult {
  id: string;
  playerName: string;
  region: CareerRegion;
  role: CareerRole;
  background: CareerBackground;
  finalRating: number;
  finalForm: number;
  finalMorale: number;
  seasons: CareerSeasonRecord[];
  trophies: string[];
  completedAt: string;
}

export interface CareerState {
  id: string;
  phase: CareerPhase;
  onboardingStep: OnboardingStep;
  playerName: string;
  region: CareerRegion | null;
  role: CareerRole | null;
  background: CareerBackground | null;
  stats: CareerStats;
  currentSeason: number;
  currentTeam: string;
  eventsThisSeason: number;
  usedEventIds: string[];
  currentEventId: string | null;
  seasonRecords: CareerSeasonRecord[];
  pendingOfferTeam: string | null;
  result: CareerResult | null;
}

export const EVENTS_PER_SEASON = 3;
export const TOTAL_SEASONS = 5;
export const MIN_STAT = 0;
export const MAX_STAT = 100;
