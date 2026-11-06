import type { CareerResult, CareerState } from "~/types/career";
import {
  decodeCareerResultFromShare,
  encodeCareerResultForShare,
  parseCareerResultsJson,
  parseCareerStateJson,
} from "~/utils/career/careerSchema";

export const CAREER_ACTIVE_STORAGE_KEY = "sarpbc:career-active";
export const CAREER_RESULTS_STORAGE_KEY = "sarpbc:career-results";

export { encodeCareerResultForShare, decodeCareerResultFromShare };

export function parseCareerState(raw: string | null): CareerState | null {
  return parseCareerStateJson(raw);
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

export function loadCareerResults(): Map<string, CareerResult> {
  if (!import.meta.client) return new Map();
  return parseCareerResultsJson(localStorage.getItem(CAREER_RESULTS_STORAGE_KEY));
}

export function saveCareerResult(result: CareerResult): void {
  if (!import.meta.client) return;
  const existing = loadCareerResults();
  existing.set(result.id, result);
  localStorage.setItem(CAREER_RESULTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(existing)));
}

export function loadCareerResult(id: string): CareerResult | null {
  return loadCareerResults().get(id) ?? null;
}
