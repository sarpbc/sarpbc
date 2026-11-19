import type { CareerResult, CareerState } from "~/types/career";
import { parseCareerResultsJson, parseCareerStateJson } from "~/utils/career/career-schema";

const CAREER_ACTIVE_STORAGE_KEY = "sarpbc:career-active";
const CAREER_RESULTS_STORAGE_KEY = "sarpbc:career-results";

export {
  decodeCareerResultFromShare,
  encodeCareerResultForShare,
} from "~/utils/career/career-schema";

const parseCareerState = (raw: string | null) => parseCareerStateJson(raw);

export const loadActiveCareer = function loadActiveCareer() {
  if (!import.meta.client) {
    return null;
  }

  return parseCareerState(localStorage.getItem(CAREER_ACTIVE_STORAGE_KEY));
};

export const saveActiveCareer = function saveActiveCareer(state: CareerState) {
  if (!import.meta.client) {
    return;
  }

  localStorage.setItem(CAREER_ACTIVE_STORAGE_KEY, JSON.stringify(state));
};

export const clearActiveCareer = function clearActiveCareer() {
  if (!import.meta.client) {
    return;
  }

  localStorage.removeItem(CAREER_ACTIVE_STORAGE_KEY);
};

const loadCareerResults = function loadCareerResults() {
  if (!import.meta.client) {
    return new Map<string, CareerResult>();
  }

  return parseCareerResultsJson(localStorage.getItem(CAREER_RESULTS_STORAGE_KEY));
};

export const saveCareerResult = function saveCareerResult(result: CareerResult) {
  if (!import.meta.client) {
    return;
  }

  const existing = loadCareerResults();
  existing.set(result.id, result);
  localStorage.setItem(CAREER_RESULTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(existing)));
};

export const loadCareerResult = (id: string) => loadCareerResults().get(id) ?? null;
