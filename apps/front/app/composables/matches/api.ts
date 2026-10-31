import type {
  MatchDetailResponse,
  MatchListItem,
  MatchResultsResponse,
  UpcomingMatchesResponse,
} from "~/types/matches";
import { apiFetch } from "~/utils/apiFetch";
import { parseMatchResults } from "~/utils/parseMatchResult";

function parseMatchListItem(item: MatchListItem): MatchListItem {
  return {
    ...item,
    results: parseMatchResults(item.results),
  };
}

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

function isSidebarQuery(query?: MatchesListQuery): boolean {
  return !query?.limit && !query?.offset && !query?.leagueId && !query?.tournamentId;
}

function normalizeUpcoming(res: UpcomingMatchesResponse): UpcomingMatchesResponse {
  const live = (res.live ?? []).map(parseMatchListItem);
  const upcoming = (res.upcoming ?? []).map(parseMatchListItem);

  return {
    live,
    upcoming,
    liveTotal: res.liveTotal ?? live.length,
    upcomingTotal: res.upcomingTotal ?? upcoming.length,
    total: res.total ?? live.length + upcoming.length,
  };
}

function normalizeResults(res: MatchResultsResponse): MatchResultsResponse {
  const results = (res.results ?? []).map(parseMatchListItem);

  return {
    results,
    total: res.total ?? results.length,
  };
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

export async function fetchUpcomingMatches(
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> {
  const res = await apiFetch<UpcomingMatchesResponse>(matchesPath("/matches/upcoming", query), {
    method: "GET",
  });
  return normalizeUpcoming(res);
}

export async function fetchMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  const res = await apiFetch<MatchResultsResponse>(matchesPath("/matches/results", query), {
    method: "GET",
  });
  return normalizeResults(res);
}

export async function getUpcomingMatches(
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> {
  if (import.meta.server && isSidebarQuery(query)) {
    return loadSidebar(upcomingSidebar, () => fetchUpcomingMatches(query));
  }
  return fetchUpcomingMatches(query);
}

export async function getMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  if (import.meta.server && isSidebarQuery(query)) {
    return loadSidebar(resultsSidebar, () => fetchMatchesResults(query));
  }
  return fetchMatchesResults(query);
}

export async function getMatchById(id: string): Promise<MatchDetailResponse> {
  const response = await apiFetch<MatchDetailResponse>(`/matches/${id}`, {
    method: "GET",
  });

  return {
    ...response,
    match: {
      ...response.match,
      results: parseMatchResults(response.match.results),
    },
  };
}
