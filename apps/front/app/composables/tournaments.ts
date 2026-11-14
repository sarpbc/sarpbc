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

const listPath = (path: string, query: TournamentListQuery): string => {
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

  if (activeOnly === true) {
    params.set("activeOnly", "true");
  }

  const search = params.toString();

  return search ? `${path}?${search}` : path;
};

export const getAllTournaments = async (
  query: TournamentListQuery = {},
): Promise<{ tournaments: TournamentListItem[]; total: number }> => {
  const res = await apiFetch<{ tournaments?: TournamentListItem[]; count?: number }>(
    listPath("/tournaments", query),
    { method: "GET" },
  );

  const tournaments = res.tournaments ?? [];

  return { tournaments, total: res.count ?? tournaments.length };
};

export const getEvents = async (
  query: TournamentListQuery,
): Promise<{ events: TournamentEvent<TournamentListItem>[]; total: number }> => {
  const res = await apiFetch<{ events: TournamentEvent<TournamentListItem>[]; count: number }>(
    listPath("/events", query),
    { method: "GET" },
  );

  return { events: res.events, total: res.count };
};

/** Resolves `/tournaments/{segments}`, legacy stage ids included. A 404 resolves to null. */
export const resolveTournamentPath = async (
  segments: readonly string[],
): Promise<TournamentPathResponse | null> => {
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");

  try {
    return await apiFetch<TournamentPathResponse>(`/events/resolve/${path}`, {
      method: "GET",
    });
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};

export const getTournamentById = async (id: string): Promise<TournamentDetail | null> => {
  try {
    const res = await apiFetch<{ tournament?: TournamentDetail }>(`/tournaments/${id}`, {
      method: "GET",
    });

    return res.tournament ?? null;
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};

export const getTournamentMatches = async (
  tournamentId: string,
): Promise<TournamentMatchListItem[]> => {
  const res = await apiFetch<{ matches?: TournamentMatchListItem[] }>(
    `/tournaments/${tournamentId}/matches`,
    { method: "GET" },
  );

  return res.matches ?? [];
};

export const getTournamentPlayerStats = async (
  tournamentId: string,
): Promise<TournamentPlayerStatsResponse> =>
  await apiFetch<TournamentPlayerStatsResponse>(`/tournaments/${tournamentId}/player-stats`, {
    method: "GET",
  });

export const getEventPlayerStats = async (
  eventSlug: string,
): Promise<TournamentPlayerStatsResponse> =>
  await apiFetch<TournamentPlayerStatsResponse>(
    `/events/${encodeURIComponent(eventSlug)}/player-stats`,
    { method: "GET" },
  );
