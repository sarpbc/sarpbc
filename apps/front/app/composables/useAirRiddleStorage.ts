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

const RESULT_VALUES = new Set<string>(Object.values(AirRiddleResultEnum));

/** Calendar date for today's Air Riddle, aligned with the API (Europe/Berlin). */
export function getAirRiddleDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AIR_RIDDLE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isValidResult(value: unknown): value is AirRiddleResultEnum {
  return typeof value === "string" && RESULT_VALUES.has(value);
}

function isValidAttempt(value: unknown, targetLength: number): value is AirRiddleStoredAttempt {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const attempt = value as AirRiddleStoredAttempt;
  if (
    !Array.isArray(attempt.letters) ||
    attempt.letters.length !== targetLength ||
    !attempt.letters.every((letter) => typeof letter === "string")
  ) {
    return false;
  }

  if (attempt.results === undefined) {
    return true;
  }

  return (
    Array.isArray(attempt.results) &&
    attempt.results.length === targetLength &&
    attempt.results.every(isValidResult)
  );
}

export function parseAirRiddleStoredState(
  raw: string | null,
  today: string,
): AirRiddleStoredState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }

    const state = parsed as Partial<AirRiddleStoredState>;
    if (
      state.date !== today ||
      typeof state.targetLength !== "number" ||
      state.targetLength <= 0 ||
      !Array.isArray(state.attempts) ||
      typeof state.isWon !== "boolean" ||
      typeof state.isGameOver !== "boolean"
    ) {
      return null;
    }

    if (state.attempts.length > 6) {
      return null;
    }

    if (!state.attempts.every((attempt) => isValidAttempt(attempt, state.targetLength!))) {
      return null;
    }

    if (state.answer !== undefined && typeof state.answer !== "string") {
      return null;
    }

    return {
      date: state.date,
      targetLength: state.targetLength,
      attempts: state.attempts,
      isWon: state.isWon,
      isGameOver: state.isGameOver,
      answer: state.answer,
    };
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
