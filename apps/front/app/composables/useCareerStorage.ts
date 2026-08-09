import type { CareerResult, CareerState } from "~/types/career";
import { CAREER_BACKGROUNDS, CAREER_REGIONS, CAREER_ROLES } from "~/types/career";

export const CAREER_ACTIVE_STORAGE_KEY = "sarpbc:career-active";
export const CAREER_RESULTS_STORAGE_KEY = "sarpbc:career-results";

function isValidRegion(value: unknown): value is CareerState["region"] {
  return value === null || (typeof value === "string" && CAREER_REGIONS.includes(value as never));
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
      !isValidRole(state.role) ||
      !isValidBackground(state.background) ||
      !isValidStats(state.stats) ||
      typeof state.currentSeason !== "number" ||
      typeof state.currentTeam !== "string" ||
      typeof state.eventsThisSeason !== "number" ||
      !Array.isArray(state.usedEventIds) ||
      !Array.isArray(state.seasonRecords)
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
    if (typeof result.id !== "string" || typeof result.finalRating !== "number") {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}
