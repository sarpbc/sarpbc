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

export async function getMatchesResults(query?: MatchesListQuery): Promise<MatchResultsResponse> {
  const res = await $fetch<MatchResultsResponse>(buildMatchesUrl("/matches/results", query), {
    method: "GET",
    credentials: "include",
  });

  const results = (res.results ?? []).map(parseMatchListItem);

  return {
    results,
    total: res.total ?? results.length,
  };
}

export async function getMatchById(id: string): Promise<MatchDetailResponse> {
  const config = useRuntimeConfig();
  const response = await $fetch<MatchDetailResponse>(`${config.public.apiBase}/matches/${id}`, {
    method: "GET",
    credentials: "include",
  });

  return {
    ...response,
    match: {
      ...response.match,
      results: parseMatchResults(response.match.results),
    },
  };
}
