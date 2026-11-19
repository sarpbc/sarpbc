import { isNonEmptyString } from "@sarpbc/utils";
import * as z from "zod";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const AIR_RIDDLE_STORAGE_KEY = "sarpbc:air-riddle";
const AIR_RIDDLE_TIMEZONE = "Europe/Berlin";

interface AirRiddleStoredAttempt {
  letters: string[];
  results?: AirRiddleResultEnum[];
}

export interface AirRiddleStoredState {
  date: string;
  targetLength: number;
  attempts: AirRiddleStoredAttempt[];
  isWon: boolean;
  isGameOver: boolean;
  answer?: string;
}

const AIR_RIDDLE_RESULTS = [
  AirRiddleResultEnum.CORRECT,
  AirRiddleResultEnum.MISPLACED,
  AirRiddleResultEnum.INCORRECT,
] as const;

const airRiddleAttemptSchema = z.object({
  letters: z.array(z.string()),
  results: z.array(z.enum(AIR_RIDDLE_RESULTS)).optional(),
});

const airRiddleStoredStateSchema = z.object({
  answer: z.string().optional(),
  attempts: z.array(airRiddleAttemptSchema),
  date: z.string(),
  isGameOver: z.boolean(),
  isWon: z.boolean(),
  targetLength: z.number(),
});

export const AIR_RIDDLE_MAX_ATTEMPTS = 6;

// WARNING: the date key must match the API calendar day (Europe/Berlin).
const getAirRiddleDateKey = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: AIR_RIDDLE_TIMEZONE,
    year: "numeric",
  }).format(now);

const parseAirRiddleStoredState = (raw: string | null, today: string) => {
  if (!isNonEmptyString(raw)) {
    return null;
  }

  try {
    const parsed = airRiddleStoredStateSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return null;
    }

    const state = parsed.data;

    if (
      state.date !== today ||
      state.targetLength <= 0 ||
      state.attempts.length > AIR_RIDDLE_MAX_ATTEMPTS
    ) {
      return null;
    }

    const attemptsMatchLength = state.attempts.every((attempt) => {
      if (attempt.letters.length !== state.targetLength) {
        return false;
      }

      return attempt.results === undefined || attempt.results.length === state.targetLength;
    });

    if (!attemptsMatchLength) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
};

export const loadAirRiddleStoredState = function loadAirRiddleStoredState(
  today = getAirRiddleDateKey(),
) {
  if (!import.meta.client) {
    return null;
  }

  const stored = parseAirRiddleStoredState(localStorage.getItem(AIR_RIDDLE_STORAGE_KEY), today);

  if (!stored) {
    localStorage.removeItem(AIR_RIDDLE_STORAGE_KEY);
  }

  return stored;
};

export const saveAirRiddleStoredState = function saveAirRiddleStoredState(
  state: Omit<AirRiddleStoredState, "date">,
) {
  if (!import.meta.client) {
    return;
  }

  const payload: AirRiddleStoredState = {
    date: getAirRiddleDateKey(),
    ...state,
  };

  localStorage.setItem(AIR_RIDDLE_STORAGE_KEY, JSON.stringify(payload));
};
