import type {
  CareerDestinyLeanings,
  CareerResult,
  CareerRoster,
  CareerState,
  CareerWorldState,
} from "~/types/career";
import {
  CAREER_BACKGROUNDS,
  CAREER_COUNTRIES,
  CAREER_DESTINIES,
  CAREER_REGIONS,
  CAREER_ROLES,
  ROSTER_SIZE,
} from "~/types/career";

export const CAREER_ACTIVE_STORAGE_KEY = "sarpbc:career-active";
export const CAREER_RESULTS_STORAGE_KEY = "sarpbc:career-results";

const ALL_COUNTRIES: readonly string[] = Object.values(CAREER_COUNTRIES).flat();

function isValidRegion(value: unknown): value is CareerState["region"] {
  return value === null || (typeof value === "string" && CAREER_REGIONS.includes(value as never));
}

function isValidCountry(value: unknown): value is CareerState["country"] {
  return value === null || (typeof value === "string" && ALL_COUNTRIES.includes(value));
}

function isValidRole(value: unknown): value is CareerState["role"] {
  return value === null || (typeof value === "string" && CAREER_ROLES.includes(value as never));
}

function isValidBackground(value: unknown): value is CareerState["background"] {
  return (
    value === null || (typeof value === "string" && CAREER_BACKGROUNDS.includes(value as never))
  );
}

function isValidStats(value: unknown): value is CareerState["stats"] {
  if (value === null || typeof value !== "object") return false;
  const stats = value as CareerState["stats"];
  return (
    typeof stats.rating === "number" &&
    typeof stats.form === "number" &&
    typeof stats.morale === "number"
  );
}

function isValidDestinyLeanings(value: unknown): value is CareerDestinyLeanings {
  if (value === null || typeof value !== "object") return false;
  const leanings = value as CareerDestinyLeanings;
  return (
    typeof leanings.quit === "number" &&
    typeof leanings.streamer === "number" &&
    typeof leanings.coach === "number"
  );
}

function isValidRoster(value: unknown): value is CareerRoster {
  return (
    Array.isArray(value) &&
    value.length === ROSTER_SIZE &&
    value.every((id) => typeof id === "string")
  );
}

function isValidWorld(value: unknown): value is CareerWorldState {
  if (value === null || typeof value !== "object") return false;
  const world = value as CareerWorldState;
  if (typeof world.rosters !== "object" || world.rosters === null) return false;
  if (typeof world.players !== "object" || world.players === null) return false;
  if (
    !Array.isArray(world.freeAgentIds) ||
    !world.freeAgentIds.every((id) => typeof id === "string")
  ) {
    return false;
  }
  if (typeof world.nextGeneratedId !== "number") return false;
  for (const roster of Object.values(world.rosters)) {
    if (!isValidRoster(roster)) return false;
  }
  return true;
}

export function parseCareerState(raw: string | null): CareerState | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;

    const state = parsed as Partial<CareerState>;
    if (
      typeof state.id !== "string" ||
      typeof state.phase !== "string" ||
      typeof state.onboardingStep !== "string" ||
      typeof state.playerName !== "string" ||
      !isValidRegion(state.region) ||
      !isValidCountry(state.country) ||
      !isValidRole(state.role) ||
      !isValidBackground(state.background) ||
      !isValidStats(state.stats) ||
      typeof state.currentSeason !== "number" ||
      typeof state.currentStage !== "string" ||
      typeof state.currentTeamId !== "string" ||
      !isValidWorld(state.world) ||
      !Array.isArray(state.usedEventIds) ||
      !Array.isArray(state.currentSplits) ||
      !Array.isArray(state.seasonRecords) ||
      !Array.isArray(state.pendingOfferTeamIds) ||
      typeof state.renewalOffered !== "boolean" ||
      typeof state.isLastChanceOffer !== "boolean" ||
      typeof state.offseasonDestinyPending !== "boolean" ||
      !isValidDestinyLeanings(state.destinyLeanings)
    ) {
      return null;
    }

    return state as CareerState;
  } catch {
    return null;
  }
}

export function loadActiveCareer(): CareerState | null {
  if (!import.meta.client) return null;
  return parseCareerState(localStorage.getItem(CAREER_ACTIVE_STORAGE_KEY));
}

export function saveActiveCareer(state: CareerState): void {
  if (!import.meta.client) return;
  localStorage.setItem(CAREER_ACTIVE_STORAGE_KEY, JSON.stringify(state));
}

export function clearActiveCareer(): void {
  if (!import.meta.client) return;
  localStorage.removeItem(CAREER_ACTIVE_STORAGE_KEY);
}

export function loadCareerResults(): Record<string, CareerResult> {
  if (!import.meta.client) return {};

  try {
    const raw = localStorage.getItem(CAREER_RESULTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};
    return parsed as Record<string, CareerResult>;
  } catch {
    return {};
  }
}

export function saveCareerResult(result: CareerResult): void {
  if (!import.meta.client) return;
  const existing = loadCareerResults();
  existing[result.id] = result;
  localStorage.setItem(CAREER_RESULTS_STORAGE_KEY, JSON.stringify(existing));
}

export function loadCareerResult(id: string): CareerResult | null {
  const results = loadCareerResults();
  return results[id] ?? null;
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
    if (parsed === null || typeof parsed !== "object") return null;
    const result = parsed as CareerResult;
    if (
      typeof result.id !== "string" ||
      typeof result.finalRating !== "number" ||
      typeof result.retiredAge !== "number" ||
      !CAREER_DESTINIES.includes(result.destiny as never)
    ) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}
