import type {
  MatchDetailResponse,
  MatchListItem,
  MatchResultsResponse,
  UpcomingMatchesResponse,
} from "~/types/matches";
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

function buildMatchesUrl(path: string, query?: MatchesListQuery): string {
  const url = new URL(`${useApiBase()}${path}`);

  if (query?.limit !== undefined) {
    url.searchParams.set("limit", String(query.limit));
  }
  if (query?.offset !== undefined && query.offset > 0) {
    url.searchParams.set("offset", String(query.offset));
  }
  if (query?.leagueId) {
    url.searchParams.set("leagueId", query.leagueId);
  }
  if (query?.tournamentId) {
    url.searchParams.set("tournamentId", query.tournamentId);
  }

  return url.toString();
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

const MATCH_LIST_MAX_AGE_MS = 30_000;

type TimedValue<T> = {
  expiresAt: number;
  value: T;
};

function matchesListCacheKey(query?: MatchesListQuery): string {
  if (!query) {
    return "default";
  }
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query.offset) {
    params.set("offset", String(query.offset));
  }
  if (query.leagueId) {
    params.set("leagueId", query.leagueId);
  }
  if (query.tournamentId) {
    params.set("tournamentId", query.tournamentId);
  }
  return params.toString() || "default";
}

function createListCache<T>() {
  const values = new Map<string, TimedValue<T>>();
  const pending = new Map<string, Promise<T>>();

  return async function load(key: string, fetchList: () => Promise<T>): Promise<T> {
    const cached = values.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const inflight = pending.get(key);
    if (inflight) {
      return inflight;
    }
    const request = fetchList()
      .then((value) => {
        values.set(key, { expiresAt: Date.now() + MATCH_LIST_MAX_AGE_MS, value });
        return value;
      })
      .finally(() => {
        pending.delete(key);
      });
    pending.set(key, request);
    return request;
  };
}

const loadUpcoming = createListCache<UpcomingMatchesResponse>();
const loadResults = createListCache<MatchResultsResponse>();

function normalizeResults(res: MatchResultsResponse): MatchResultsResponse {
  const results = (res.results ?? []).map(parseMatchListItem);

  return {
    results,
    total: res.total ?? results.length,
  };
}

export async function fetchUpcomingMatches(
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> {
  const res = await $fetch<UpcomingMatchesResponse>(buildMatchesUrl("/matches/upcoming", query), {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });
  return normalizeUpcoming(res);
}

export async function fetchMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  const res = await $fetch<MatchResultsResponse>(buildMatchesUrl("/matches/results", query), {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });
  return normalizeResults(res);
}

export async function getUpcomingMatches(
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> {
  if (import.meta.server) {
    return loadUpcoming(matchesListCacheKey(query), () => fetchUpcomingMatches(query));
  }
  return fetchUpcomingMatches(query);
}

export async function getMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  if (import.meta.server) {
    return loadResults(matchesListCacheKey(query), () => fetchMatchesResults(query));
  }
  return fetchMatchesResults(query);
}

export async function getMatchById(id: string): Promise<MatchDetailResponse> {
  const response = await $fetch<MatchDetailResponse>(`${useApiBase()}/matches/${id}`, {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });

  return {
    ...response,
    match: {
      ...response.match,
      results: parseMatchResults(response.match.results),
    },
  };
}
