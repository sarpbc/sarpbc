import { isNonEmptyString } from "@sarpbc/utils";
import { z } from "zod";
import {
  CAREER_BACKGROUNDS,
  CAREER_COUNTRIES,
  CAREER_DESTINIES,
  CAREER_NICKNAME_KEYS,
  CAREER_PHASES,
  CAREER_PLACEMENTS,
  CAREER_REGIONS,
  CAREER_ROLES,
  CAREER_STAGES,
  ONBOARDING_STEPS,
  ROSTER_SIZE,
} from "~/types/career";
import type { CareerResult, CareerState } from "~/types/career";

const ALL_COUNTRIES = Object.values(CAREER_COUNTRIES).flat();

const careerRegionSchema = z.enum(CAREER_REGIONS);
const careerCountrySchema = z.enum(ALL_COUNTRIES);
const careerRoleSchema = z.enum(CAREER_ROLES);
const careerBackgroundSchema = z.enum(CAREER_BACKGROUNDS);
const careerPhaseSchema = z.enum(CAREER_PHASES);
const onboardingStepSchema = z.enum(ONBOARDING_STEPS);
const careerStageSchema = z.enum(CAREER_STAGES);
const careerPlacementSchema = z.enum(CAREER_PLACEMENTS);

const statsSchema = z.object({
  form: z.number(),
  morale: z.number(),
  rating: z.number(),
});

const destinyLeaningsSchema = z.object({
  coach: z.number(),
  quit: z.number(),
  streamer: z.number(),
});

const rosterSchema = z
  .tuple([z.string(), z.string(), z.string()])
  .refine((value) => value.length === ROSTER_SIZE);

const npcPlayerSchema = z.object({
  form: z.number(),
  id: z.string(),
  morale: z.number(),
  name: z.string(),
  rating: z.number(),
  region: careerRegionSchema,
});

const rankSnapshotEntrySchema = z.object({
  points: z.number(),
  teamId: z.string(),
});

const splitFieldResultSchema = z.object({
  points: z.record(z.string(), z.number()),
  season: z.number(),
  split: z.number(),
});

const worldStateSchema = z.object({
  freeAgentIds: z.array(z.string()),
  nextGeneratedId: z.number(),
  players: z.record(z.string(), npcPlayerSchema),
  rankSnapshot: z.array(rankSnapshotEntrySchema).nullable().default(null),
  rosters: z.record(z.string(), rosterSchema),
  splitFields: z.array(splitFieldResultSchema).default([]),
});

const splitRecordSchema = z.object({
  major: careerPlacementSchema.nullable(),
  points: z.number(),
  regionals: z.array(careerPlacementSchema),
  split: z.number(),
});

const seasonRecordSchema = z.object({
  points: z.number(),
  ratingEnd: z.number(),
  season: z.number(),
  splits: z.array(splitRecordSchema),
  teamId: z.string(),
  teamName: z.string(),
  worlds: careerPlacementSchema.nullable(),
});

const eventOutcomeSchema = z.object({
  choiceId: z.string(),
  delta: statsSchema.partial(),
  destiny: destinyLeaningsSchema.partial(),
  eventId: z.string(),
  failed: z.boolean().optional(),
});

const careerResultSchema = z.object({
  background: careerBackgroundSchema,
  completedAt: z.string(),
  country: careerCountrySchema,
  destiny: z.enum(CAREER_DESTINIES),
  finalForm: z.number(),
  finalMorale: z.number(),
  finalRating: z.number(),
  id: z.string(),
  nicknameKey: z.enum(CAREER_NICKNAME_KEYS),
  playerName: z.string(),
  region: careerRegionSchema,
  retiredAge: z.number(),
  role: careerRoleSchema,
  seasons: z.array(seasonRecordSchema),
  trophies: z.array(
    z.object({
      season: z.number(),
      type: z.enum(["regional", "major", "worlds"]),
    }),
  ),
});

const careerStateSchema = z.object({
  background: careerBackgroundSchema.nullable(),
  country: careerCountrySchema.nullable(),
  currentEventId: z.string().nullable(),
  currentSeason: z.number(),
  currentSplits: z.array(splitRecordSchema),
  currentStage: careerStageSchema,
  currentTeamId: z.string(),
  currentWorlds: careerPlacementSchema.nullable(),
  destinyLeanings: destinyLeaningsSchema,
  eventsQueuedForStage: z.number(),
  eventsResolvedForStage: z.number(),
  id: z.string(),
  isLastChanceOffer: z.boolean(),
  lastEventOutcome: eventOutcomeSchema.nullable(),
  offseasonDestinyPending: z.boolean(),
  onboardingStep: onboardingStepSchema,
  pendingOfferTeamIds: z.array(z.string()),
  pendingSkipMajor: z.boolean(),
  pendingSkipRegionals: z.number(),
  phase: careerPhaseSchema,
  playerName: z.string(),
  region: careerRegionSchema.nullable(),
  renewalOffered: z.boolean(),
  result: careerResultSchema.nullable(),
  resumePhase: z.preprocess((value) => value ?? null, careerPhaseSchema.nullable()),
  role: careerRoleSchema.nullable(),
  seasonRecords: z.array(seasonRecordSchema),
  stats: statsSchema,
  usedEventIds: z.array(z.string()),
  world: worldStateSchema,
});

const normalizeLoadedCareerState = (state: CareerState) => {
  const withDefaults: CareerState = {
    ...state,
    resumePhase: state.resumePhase ?? null,
    world: {
      ...state.world,
      rankSnapshot: state.world.rankSnapshot ?? null,
      splitFields: state.world.splitFields ?? [],
    },
  };

  if (withDefaults.phase !== "menu" && withDefaults.phase !== "career_end") {
    return {
      ...withDefaults,
      phase: "menu",
      resumePhase: withDefaults.resumePhase ?? withDefaults.phase,
    } satisfies CareerState;
  }

  return withDefaults;
};

export const parseCareerStateJson = (raw: string | null) => {
  if (!isNonEmptyString(raw)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = careerStateSchema.safeParse(parsed);

    if (!result.success) {
      return null;
    }

    return normalizeLoadedCareerState(result.data);
  } catch {
    return null;
  }
};

const parseCareerResultJson = (raw: string) => {
  try {
    const result = careerResultSchema.safeParse(JSON.parse(raw));

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const careerResultsSchema = z.record(z.string(), careerResultSchema.nullable().catch(null));

export const parseCareerResultsJson = (raw: string | null) => {
  const results = new Map<string, CareerResult>();

  if (!isNonEmptyString(raw)) {
    return results;
  }

  try {
    const parsed = careerResultsSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return results;
    }

    for (const [id, result] of Object.entries(parsed.data)) {
      if (result) {
        results.set(id, result);
      }
    }
  } catch {
    return new Map<string, CareerResult>();
  }

  return results;
};

export const encodeCareerResultForShare = (result: CareerResult) =>
  btoa(encodeURIComponent(JSON.stringify(result)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/[=]+$/u, "");

export const decodeCareerResultFromShare = (encoded: string) => {
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const json = decodeURIComponent(atob(padded));

    return parseCareerResultJson(json);
  } catch {
    return null;
  }
};
