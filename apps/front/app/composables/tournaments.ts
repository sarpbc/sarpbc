import type {
  TournamentDetail,
  TournamentEvent,
  TournamentListItem,
  TournamentMatchListItem,
  TournamentPathResponse,
  TournamentPlayerStatsResponse,
} from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

interface TournamentListQuery {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}

function listPath(path: string, query: TournamentListQuery): string {
  const { limit, offset, pickems, activeOnly } = query;
  const params = new URLSearchParams();

  if (limit !== undefined) {
    params.set("limit", String(limit));
  }

  if (offset !== undefined) {
    params.set("offset", String(offset));
  }

  if (pickems !== undefined) {
    params.set("pickems", pickems ? "true" : "false");
  }

  if (activeOnly) {
    params.set("activeOnly", "true");
  }

  const search = params.toString();

  return search ? `${path}?${search}` : path;
}

export async function getAllTournaments(
  query: TournamentListQuery = {},
): Promise<{ tournaments: TournamentListItem[]; total: number }> {
  const res = await apiFetch<{ tournaments?: TournamentListItem[]; count?: number }>(
    listPath("/tournaments", query),
    { method: "GET" },
  );

  const tournaments = res.tournaments ?? [];

  return { tournaments, total: res.count ?? tournaments.length };
}

export async function getEvents(
  query: TournamentListQuery,
): Promise<{ events: TournamentEvent<TournamentListItem>[]; total: number }> {
  const res = await apiFetch<{ events: TournamentEvent<TournamentListItem>[]; count: number }>(
    listPath("/events", query),
    { method: "GET" },
  );

  return { events: res.events, total: res.count };
}

/** Resolves `/tournaments/{segments}`, legacy stage ids included. A 404 resolves to null. */
export async function resolveTournamentPath(
  segments: readonly string[],
): Promise<TournamentPathResponse | null> {
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");

  try {
    return await apiFetch<TournamentPathResponse>(`/events/resolve/${path}`, {
      method: "GET",
    });
  } catch (cause) {
    if (getApiErrorStatus(cause) === 404) {
      return null;
    }

    throw cause;
  }
}

export async function getTournamentById(id: string): Promise<TournamentDetail | null> {
  try {
    const res = await apiFetch<{ tournament?: TournamentDetail }>(`/tournaments/${id}`, {
      method: "GET",
    });

    return res.tournament ?? null;
  } catch (cause) {
    if (getApiErrorStatus(cause) === 404) {
      return null;
    }

    throw cause;
  }
}

export async function getTournamentMatches(
  tournamentId: string,
): Promise<TournamentMatchListItem[]> {
  const res = await apiFetch<{ matches?: TournamentMatchListItem[] }>(
    `/tournaments/${tournamentId}/matches`,
    { method: "GET" },
  );

  return res.matches ?? [];
}

export function getTournamentPlayerStats(
  tournamentId: string,
): Promise<TournamentPlayerStatsResponse> {
  return apiFetch<TournamentPlayerStatsResponse>(`/tournaments/${tournamentId}/player-stats`, {
    method: "GET",
  });
}

export function getEventPlayerStats(eventSlug: string): Promise<TournamentPlayerStatsResponse> {
  return apiFetch<TournamentPlayerStatsResponse>(
    `/events/${encodeURIComponent(eventSlug)}/player-stats`,
    { method: "GET" },
  );
}
