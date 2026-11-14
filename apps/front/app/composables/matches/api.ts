import { isNonEmptyString } from "@sarpbc/utils";
import type { MatchResultsResponse, MatchVod, UpcomingMatchesResponse } from "@sarpbc/types";
import type { MatchDetailResponse, MatchDetailWire } from "~/types/matches";
// Nitro routes import this file and have no Nuxt auto-imports.
import { apiFetch } from "@sarpbc/composables/api-fetch";

export interface MatchesListQuery {
  limit?: number;
  offset?: number;
  leagueId?: string;
  tournamentId?: string;
}

const matchesPath = (path: string, query?: MatchesListQuery): string => {
  const params = new URLSearchParams();

  if (query?.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query?.offset !== undefined && query.offset > 0) {
    params.set("offset", String(query.offset));
  }

  if (isNonEmptyString(query?.leagueId)) {
    params.set("leagueId", query.leagueId);
  }

  if (isNonEmptyString(query?.tournamentId)) {
    params.set("tournamentId", query.tournamentId);
  }

  const search = params.toString();

  return search ? `${path}?${search}` : path;
};

const SIDEBAR_MAX_AGE_MS = 30_000;

interface Slot<T> {
  expiresAt: number;
  value: T;
}

interface SidebarCache<T> {
  slot?: Slot<T>;
  pending?: Promise<T>;
}

const upcomingSidebar: SidebarCache<UpcomingMatchesResponse> = {};
const resultsSidebar: SidebarCache<MatchResultsResponse> = {};

const loadSidebar = async <T>(cache: SidebarCache<T>, load: () => Promise<T>): Promise<T> => {
  if (cache.slot && cache.slot.expiresAt > Date.now()) {
    return await Promise.resolve(cache.slot.value);
  }

  if (cache.pending) {
    return await cache.pending;
  }

  const request = load()
    .then((value) => {
      cache.slot = { expiresAt: Date.now() + SIDEBAR_MAX_AGE_MS, value };

      return value;
    })
    .finally(() => {
      cache.pending = undefined;
    });

  cache.pending = request;

  return await request;
};

export const getUpcomingMatches = async (
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> =>
  await apiFetch<UpcomingMatchesResponse>(matchesPath("/matches/upcoming", query), {
    method: "GET",
  });

export const getMatchesResults = async (query?: MatchesListQuery): Promise<MatchResultsResponse> =>
  await apiFetch<MatchResultsResponse>(matchesPath("/matches/results", query), {
    method: "GET",
  });

/** Rendered on every SSR page: share one response across requests instead of calling the API each time. */
export const getSidebarUpcomingMatches =
  async function getSidebarUpcomingMatches(): Promise<UpcomingMatchesResponse> {
    return import.meta.server
      ? await loadSidebar(upcomingSidebar, getUpcomingMatches)
      : await getUpcomingMatches();
  };

export const getSidebarMatchesResults =
  async function getSidebarMatchesResults(): Promise<MatchResultsResponse> {
    return import.meta.server
      ? await loadSidebar(resultsSidebar, getMatchesResults)
      : await getMatchesResults();
  };

export const getMatchById = async (id: string): Promise<MatchDetailResponse> => {
  const response = await apiFetch<MatchDetailWire>(`/matches/${id}`, {
    method: "GET",
  });

  return {
    ...response,
    match: {
      ...response.match,
      results: response.match.results.map(({ participant, score }) => ({
        participant: participant.id,
        score,
      })),
    },
  };
};

export const setMatchVods = async (
  matchId: string,
  vods: Omit<MatchVod, "source">[],
): Promise<MatchVod[]> => {
  const response = await apiFetch<{ match: { vods: MatchVod[] } }>(
    `/tournaments/matches/${matchId}/vods`,
    { method: "PUT", body: { vods } },
  );

  return response.match.vods;
};
