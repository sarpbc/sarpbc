import { z } from "zod";
import {
  CAREER_BACKGROUNDS,
  CAREER_COUNTRIES,
  CAREER_DESTINIES,
  CAREER_NICKNAME_KEYS,
  CAREER_PLACEMENTS,
  CAREER_REGIONS,
  CAREER_ROLES,
  ROSTER_SIZE,
} from "~/types/career";
import type { CareerResult, CareerState } from "~/types/career";

const ALL_COUNTRIES = Object.values(CAREER_COUNTRIES).flat();

const careerRegionSchema = z.enum(CAREER_REGIONS);
const careerCountrySchema = z
  .string()
  .refine((value): value is (typeof ALL_COUNTRIES)[number] => ALL_COUNTRIES.includes(value));
const careerRoleSchema = z.enum(CAREER_ROLES);
const careerBackgroundSchema = z.enum(CAREER_BACKGROUNDS);
const careerPhaseSchema = z.enum([
  "menu",
  "onboarding",
  "season_intro",
  "event",
  "event_result",
  "stage_result",
  "offseason",
  "career_end",
]);
const onboardingStepSchema = z.enum(["intro", "region", "country", "role", "background"]);
const careerStageSchema = z.enum(["split1", "split2", "worlds"]);
const careerPlacementSchema = z.enum(CAREER_PLACEMENTS);

const statsSchema = z.object({
  rating: z.number(),
  form: z.number(),
  morale: z.number(),
});

const destinyLeaningsSchema = z.object({
  quit: z.number(),
  streamer: z.number(),
  coach: z.number(),
});

const rosterSchema = z
  .tuple([z.string(), z.string(), z.string()])
  .refine((value) => value.length === ROSTER_SIZE);

const npcPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number(),
  form: z.number(),
  morale: z.number(),
  region: careerRegionSchema,
});

const rankSnapshotEntrySchema = z.object({
  teamId: z.string(),
  points: z.number(),
});

const splitFieldResultSchema = z.object({
  season: z.number(),
  split: z.number(),
  points: z.record(z.string(), z.number()),
});

const worldStateSchema = z.object({
  rosters: z.record(z.string(), rosterSchema),
  players: z.record(z.string(), npcPlayerSchema),
  freeAgentIds: z.array(z.string()),
  nextGeneratedId: z.number(),
  rankSnapshot: z.array(rankSnapshotEntrySchema).nullable().default(null),
  splitFields: z.array(splitFieldResultSchema).default([]),
});

const splitRecordSchema = z.object({
  split: z.number(),
  regionals: z.array(careerPlacementSchema),
  major: careerPlacementSchema.nullable(),
  points: z.number(),
});

const seasonRecordSchema = z.object({
  season: z.number(),
  teamId: z.string(),
  teamName: z.string(),
  splits: z.array(splitRecordSchema),
  worlds: careerPlacementSchema.nullable(),
  points: z.number(),
  ratingEnd: z.number(),
});

const eventOutcomeSchema = z.object({
  eventId: z.string(),
  choiceId: z.string(),
  delta: statsSchema.partial(),
  destiny: destinyLeaningsSchema.partial(),
  failed: z.boolean().optional(),
});

const careerResultSchema = z.object({
  id: z.string(),
  playerName: z.string(),
  region: careerRegionSchema,
  country: careerCountrySchema,
  role: careerRoleSchema,
  background: careerBackgroundSchema,
  finalRating: z.number(),
  finalForm: z.number(),
  finalMorale: z.number(),
  seasons: z.array(seasonRecordSchema),
  trophies: z.array(
    z.object({
      type: z.enum(["regional", "major", "worlds"]),
      season: z.number(),
    }),
  ),
  retiredAge: z.number(),
  destiny: z.enum(CAREER_DESTINIES),
  nicknameKey: z.enum(CAREER_NICKNAME_KEYS),
  completedAt: z.string(),
});

export const careerStateSchema = z.object({
  id: z.string(),
  phase: careerPhaseSchema,
  resumePhase: z.preprocess((value) => value ?? null, careerPhaseSchema.nullable()),
  onboardingStep: onboardingStepSchema,
  playerName: z.string(),
  region: careerRegionSchema.nullable(),
  country: careerCountrySchema.nullable(),
  role: careerRoleSchema.nullable(),
  background: careerBackgroundSchema.nullable(),
  stats: statsSchema,
  currentSeason: z.number(),
  currentStage: careerStageSchema,
  currentTeamId: z.string(),
  world: worldStateSchema,
  usedEventIds: z.array(z.string()),
  currentEventId: z.string().nullable(),
  eventsQueuedForStage: z.number(),
  eventsResolvedForStage: z.number(),
  pendingSkipRegionals: z.number(),
  pendingSkipMajor: z.boolean(),
  currentSplits: z.array(splitRecordSchema),
  currentWorlds: careerPlacementSchema.nullable(),
  seasonRecords: z.array(seasonRecordSchema),
  pendingOfferTeamIds: z.array(z.string()),
  renewalOffered: z.boolean(),
  isLastChanceOffer: z.boolean(),
  offseasonDestinyPending: z.boolean(),
  destinyLeanings: destinyLeaningsSchema,
  lastEventOutcome: eventOutcomeSchema.nullable(),
  result: careerResultSchema.nullable(),
});

export function parseCareerStateJson(raw: string | null): CareerState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = careerStateSchema.safeParse(parsed);
    if (!result.success) return null;
    return normalizeLoadedCareerState(result.data);
  } catch {
    return null;
  }
}

export function parseCareerResultJson(raw: unknown): CareerResult | null {
  const result = careerResultSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Legacy saves may omit menu/resumePhase/splitFields — normalize without casting. */
function normalizeLoadedCareerState(state: CareerState): CareerState {
  const withDefaults: CareerState = {
    ...state,
    resumePhase: state.resumePhase ?? null,
    world: {
      ...state.world,
      splitFields: state.world.splitFields ?? [],
      rankSnapshot: state.world.rankSnapshot ?? null,
    },
  };

  if (withDefaults.phase !== "menu" && withDefaults.phase !== "career_end") {
    return {
      ...withDefaults,
      phase: "menu",
      resumePhase: withDefaults.resumePhase ?? withDefaults.phase,
    };
  }

  return withDefaults;
}

export function encodeCareerResultForShare(result: CareerResult): string {
  return btoa(encodeURIComponent(JSON.stringify(result)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeCareerResultFromShare(encoded: string): CareerResult | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(padded));
    const parsed: unknown = JSON.parse(json);
    return parseCareerResultJson(parsed);
  } catch {
    return null;
  }
}
