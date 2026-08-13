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
  | "event_result"
  | "stage_result"
  | "offseason"
  | "career_end";

export type OnboardingStep = "intro" | "region" | "country" | "role" | "background";

export type CareerStage = "split1" | "split2" | "worlds";

export type CareerEventPool = "split" | "worlds";

export const CAREER_DESTINIES = ["quit", "streamer", "coach"] as const;
export type CareerDestiny = (typeof CAREER_DESTINIES)[number];

/** Authored epithet keys. Display copy lives in i18n, not on the result. */
export const CAREER_NICKNAME_KEYS = [
  "goat",
  "closer",
  "iceBlood",
  "airSurgeon",
  "majorHunter",
  "surfaceFox",
  "theWall",
  "resetGhost",
  "theMic",
  "sideline",
  "walkedOff",
  "lanTourist",
] as const;
export type CareerNicknameKey = (typeof CAREER_NICKNAME_KEYS)[number];

export function isCareerNicknameKey(value: unknown): value is CareerNicknameKey {
  return typeof value === "string" && CAREER_NICKNAME_KEYS.includes(value as never);
}

export interface CareerDestinyLeanings {
  quit: number;
  streamer: number;
  coach: number;
}

export interface CareerEventChoiceDefinition {
  id: string;
  delta: Partial<CareerStats>;
  destiny?: Partial<CareerDestinyLeanings>;
}

export interface CareerEventDefinition {
  id: string;
  pool: CareerEventPool;
  minSeason?: number;
  choices: CareerEventChoiceDefinition[];
}

export interface CareerEventOutcome {
  eventId: string;
  choiceId: string;
  delta: Partial<CareerStats>;
  destiny: Partial<CareerDestinyLeanings>;
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
  retiredAge: number;
  destiny: CareerDestiny;
  nicknameKey: CareerNicknameKey;
  completedAt: string;
}

/** Roster slot occupied by the user. Not an NPC id. */
export const USER_ROSTER_ID = "user";
export const ROSTER_SIZE = 3;

export type CareerRoster = [string, string, string];

export interface CareerNpcPlayer {
  id: string;
  name: string;
  rating: number;
  region: CareerRegion;
}

/** Live world: 3-player rosters plus an unsigned pool. Template teams stay in WORLD_TEAMS. */
export interface CareerWorldState {
  rosters: Record<string, CareerRoster>;
  players: Record<string, CareerNpcPlayer>;
  freeAgentIds: string[];
  nextGeneratedId: number;
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
  world: CareerWorldState;
  usedEventIds: string[];
  currentEventId: string | null;
  currentSplits: CareerSplitRecord[];
  currentWorlds: CareerPlacement | null;
  seasonRecords: CareerSeasonRecord[];
  pendingOfferTeamIds: string[];
  renewalOffered: boolean;
  isLastChanceOffer: boolean;
  offseasonDestinyPending: boolean;
  destinyLeanings: CareerDestinyLeanings;
  lastEventOutcome: CareerEventOutcome | null;
  result: CareerResult | null;
}

export const STARTING_AGE = 16;
export const PEAK_SEASONS = 5;
export const SPLITS_PER_SEASON = 2;
export const REGIONALS_PER_SPLIT = 3;
export const MAJOR_QUALIFICATION_POINTS = 10;
export const WORLDS_QUALIFICATION_POINTS = 42;
export const MIN_STAT = 0;
/** Hard ceiling — 95 is near-mythical; 100 is not reachable. */
export const MAX_STAT = 95;

export function getPlayerAge(season: number): number {
  return STARTING_AGE + season - 1;
}

export function getSeasonsPastPeak(season: number): number {
  return Math.max(0, season - PEAK_SEASONS);
}

export function getRetiredAge(seasonsPlayed: number): number {
  return STARTING_AGE + seasonsPlayed;
}

export function emptyDestinyLeanings(): CareerDestinyLeanings {
  return { quit: 0, streamer: 0, coach: 0 };
}

export function applyDestinyLeanings(
  current: CareerDestinyLeanings,
  delta: Partial<CareerDestinyLeanings>,
): CareerDestinyLeanings {
  return {
    quit: current.quit + (delta.quit ?? 0),
    streamer: current.streamer + (delta.streamer ?? 0),
    coach: current.coach + (delta.coach ?? 0),
  };
}

export function getRecommendedDestiny(leanings: CareerDestinyLeanings): CareerDestiny {
  const order: CareerDestiny[] = ["quit", "streamer", "coach"];
  let best: CareerDestiny = "quit";
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const destiny of order) {
    if (leanings[destiny] > bestScore) {
      best = destiny;
      bestScore = leanings[destiny];
    }
  }
  return best;
}

export function listPositiveDestinyLeans(delta: Partial<CareerDestinyLeanings>): CareerDestiny[] {
  return CAREER_DESTINIES.filter((destiny) => (delta[destiny] ?? 0) > 0);
}
