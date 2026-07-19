import type {
  MatchDetailResponse,
  MatchResultsResponse,
  UpcomingMatchesResponse,
} from "~/types/matches";

export type MatchesListQuery = {
  limit?: number;
  offset?: number;
  /** User-facing tournament filter — League id in the API. */
  leagueId?: string;
  /** Sub-event filter — Tournament id in the API. */
  tournamentId?: string;
};

function buildMatchesUrl(path: string, query?: MatchesListQuery): string {
  const config = useRuntimeConfig();
  const url = new URL(`${config.public.apiBase}${path}`);

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

export async function getUpcomingMatches(
  query?: MatchesListQuery,
): Promise<UpcomingMatchesResponse> {
  const res = await $fetch<UpcomingMatchesResponse>(buildMatchesUrl("/matches/upcoming", query), {
    method: "GET",
    credentials: "include",
  });

  return {
    live: res.live ?? [],
    upcoming: res.upcoming ?? [],
    liveTotal: res.liveTotal ?? res.live?.length ?? 0,
    upcomingTotal: res.upcomingTotal ?? res.upcoming?.length ?? 0,
    total: res.total ?? (res.live?.length ?? 0) + (res.upcoming?.length ?? 0),
  };
}

export async function getMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  const res = await $fetch<MatchResultsResponse>(buildMatchesUrl("/matches/results", query), {
    method: "GET",
    credentials: "include",
  });

  const results = res.results ?? [];

  return {
    results,
    total: res.total ?? results.length,
  };
}

export async function getMatchById(id: string): Promise<MatchDetailResponse> {
  const config = useRuntimeConfig();
  return $fetch<MatchDetailResponse>(`${config.public.apiBase}/matches/${id}`, {
    method: "GET",
    credentials: "include",
  });
}
