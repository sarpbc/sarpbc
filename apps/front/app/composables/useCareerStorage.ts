import type { CareerResult, CareerState } from "~/types/career";
import {
  decodeCareerResultFromShare,
  encodeCareerResultForShare,
  parseCareerResultJson,
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

export function loadCareerResults(): Record<string, CareerResult> {
  if (!import.meta.client) return {};

  try {
    const raw = localStorage.getItem(CAREER_RESULTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};

    const results: Record<string, CareerResult> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const result = parseCareerResultJson(value);
      if (result) results[id] = result;
    }
    return results;
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
