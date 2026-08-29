import * as z from "zod";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

export const AIR_RIDDLE_STORAGE_KEY = "sarpbc:air-riddle";
export const AIR_RIDDLE_TIMEZONE = "Europe/Berlin";

export interface AirRiddleStoredAttempt {
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
  date: z.string(),
  targetLength: z.number(),
  attempts: z.array(airRiddleAttemptSchema),
  isWon: z.boolean(),
  isGameOver: z.boolean(),
  answer: z.string().optional(),
});

/** Calendar date for today's Air Riddle, aligned with the API (Europe/Berlin). */
export function getAirRiddleDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AIR_RIDDLE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseAirRiddleStoredState(
  raw: string | null,
  today: string,
): AirRiddleStoredState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = airRiddleStoredStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return null;
    }

    const state = parsed.data;
    if (state.date !== today || state.targetLength <= 0 || state.attempts.length > 6) {
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
}

export function loadAirRiddleStoredState(
  today = getAirRiddleDateKey(),
): AirRiddleStoredState | null {
  if (!import.meta.client) {
    return null;
  }

  const stored = parseAirRiddleStoredState(localStorage.getItem(AIR_RIDDLE_STORAGE_KEY), today);
  if (!stored) {
    localStorage.removeItem(AIR_RIDDLE_STORAGE_KEY);
  }
  return stored;
}

export function saveAirRiddleStoredState(state: Omit<AirRiddleStoredState, "date">): void {
  if (!import.meta.client) {
    return;
  }

  const payload: AirRiddleStoredState = {
    date: getAirRiddleDateKey(),
    ...state,
  };

  localStorage.setItem(AIR_RIDDLE_STORAGE_KEY, JSON.stringify(payload));
}
