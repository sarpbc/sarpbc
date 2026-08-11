export const CAREER_REGIONS = ["na", "eu", "oce", "sam", "mena", "apac", "ssa"] as const;
export type CareerRegion = (typeof CAREER_REGIONS)[number];

export const CAREER_COUNTRIES = {
  na: ["us", "ca", "mx"],
  eu: ["fr", "gb", "de", "es", "nl", "se", "dk", "it"],
  oce: ["au", "nz"],
  sam: ["br", "ar", "cl", "pe"],
  mena: ["sa", "ae", "ma", "eg"],
  apac: ["jp", "kr", "sg", "in"],
  ssa: ["za", "ng", "ke"],
} as const satisfies Record<CareerRegion, readonly string[]>;
export type CareerCountry = (typeof CAREER_COUNTRIES)[CareerRegion][number];

export const CAREER_ROLES = ["offense", "technical", "defense"] as const;
export type CareerRole = (typeof CAREER_ROLES)[number];

export const CAREER_BACKGROUNDS = ["prodigy", "grinder", "oneVOne", "freestyler"] as const;
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
  | "stage_result"
  | "offseason"
  | "career_end";

export type OnboardingStep = "intro" | "region" | "country" | "role" | "background";

export type CareerStage = "split1" | "split2" | "worlds";

export type CareerEventPool = "split" | "worlds";

export interface CareerEventChoiceDefinition {
  id: string;
  delta: Partial<CareerStats>;
}

export interface CareerEventDefinition {
  id: string;
  pool: CareerEventPool;
  choices: CareerEventChoiceDefinition[];
}

export const CAREER_PLACEMENTS = ["winner", "finalist", "top4", "top8", "group"] as const;
export type CareerPlacement = (typeof CAREER_PLACEMENTS)[number];

export interface CareerSplitRecord {
  split: number;
  regionals: CareerPlacement[];
  /** `null` when the team failed to qualify for the major. */
  major: CareerPlacement | null;
  points: number;
}

export interface CareerTrophy {
  type: "regional" | "major" | "worlds";
  season: number;
}

export interface CareerSeasonRecord {
  season: number;
  teamId: string;
  teamName: string;
  splits: CareerSplitRecord[];
  /** `null` when the team missed Worlds qualification. */
  worlds: CareerPlacement | null;
  points: number;
  ratingEnd: number;
}

export interface CareerResult {
  id: string;
  playerName: string;
  region: CareerRegion;
  country: CareerCountry;
  role: CareerRole;
  background: CareerBackground;
  finalRating: number;
  finalForm: number;
  finalMorale: number;
  seasons: CareerSeasonRecord[];
  trophies: CareerTrophy[];
  completedAt: string;
}

export interface CareerState {
  id: string;
  phase: CareerPhase;
  onboardingStep: OnboardingStep;
  playerName: string;
  region: CareerRegion | null;
  country: CareerCountry | null;
  role: CareerRole | null;
  background: CareerBackground | null;
  stats: CareerStats;
  currentSeason: number;
  currentStage: CareerStage;
  currentTeamId: string;
  usedEventIds: string[];
  currentEventId: string | null;
  currentSplits: CareerSplitRecord[];
  currentWorlds: CareerPlacement | null;
  seasonRecords: CareerSeasonRecord[];
  pendingOfferTeamId: string | null;
  result: CareerResult | null;
}

export const TOTAL_SEASONS = 5;
export const SPLITS_PER_SEASON = 2;
export const REGIONALS_PER_SPLIT = 3;
export const MAJOR_QUALIFICATION_POINTS = 10;
export const WORLDS_QUALIFICATION_POINTS = 42;
export const MIN_STAT = 0;
export const MAX_STAT = 100;
