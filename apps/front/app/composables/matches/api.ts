import type { MatchResultsResponse, MatchVod, UpcomingMatchesResponse } from "@sarpbc/types";
import type { MatchDetailResponse, MatchDetailWire } from "~/types/matches";
// Nitro routes import this file and have no Nuxt auto-imports.
import { apiFetch } from "@sarpbc/composables/apiFetch";

export type MatchesListQuery = {
  limit?: number;
  offset?: number;
  leagueId?: string;
  tournamentId?: string;
};

function matchesPath(path: string, query?: MatchesListQuery): string {
  const params = new URLSearchParams();

  if (query?.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query?.offset !== undefined && query.offset > 0) {
    params.set("offset", String(query.offset));
  }

  if (query?.leagueId) {
    params.set("leagueId", query.leagueId);
  }

  if (query?.tournamentId) {
    params.set("tournamentId", query.tournamentId);
  }

  const search = params.toString();

  return search ? `${path}?${search}` : path;
}

const SIDEBAR_MAX_AGE_MS = 30_000;

type Slot<T> = {
  expiresAt: number;
  value: T;
};

type SidebarCache<T> = {
  slot?: Slot<T>;
  pending?: Promise<T>;
};

const upcomingSidebar: SidebarCache<UpcomingMatchesResponse> = {};
const resultsSidebar: SidebarCache<MatchResultsResponse> = {};

function loadSidebar<T>(cache: SidebarCache<T>, load: () => Promise<T>): Promise<T> {
  if (cache.slot && cache.slot.expiresAt > Date.now()) {
    return Promise.resolve(cache.slot.value);
  }

  if (cache.pending) {
    return cache.pending;
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

  return request;
}

export function getUpcomingMatches(query?: MatchesListQuery): Promise<UpcomingMatchesResponse> {
  return apiFetch<UpcomingMatchesResponse>(matchesPath("/matches/upcoming", query), {
    method: "GET",
  });
}

export function getMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  return apiFetch<MatchResultsResponse>(matchesPath("/matches/results", query), {
    method: "GET",
  });
}

/** Rendered on every SSR page: share one response across requests instead of calling the API each time. */
export function getSidebarUpcomingMatches(): Promise<UpcomingMatchesResponse> {
  return import.meta.server
    ? loadSidebar(upcomingSidebar, getUpcomingMatches)
    : getUpcomingMatches();
}

export function getSidebarMatchesResults(): Promise<MatchResultsResponse> {
  return import.meta.server ? loadSidebar(resultsSidebar, getMatchesResults) : getMatchesResults();
}

export async function getMatchById(id: string): Promise<MatchDetailResponse> {
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
}

export async function setMatchVods(
  matchId: string,
  vods: Array<Omit<MatchVod, "source">>,
): Promise<MatchVod[]> {
  const response = await apiFetch<{ match: { vods: MatchVod[] } }>(
    `/tournaments/matches/${matchId}/vods`,
    { method: "PUT", body: { vods } },
  );

  return response.match.vods;
}
