import type { TournamentDetail, TournamentListItem, TournamentMatchListItem } from "@sarpbc/types";
import type { TournamentEvent, TournamentPathResponse } from "~/types/tournament";
import { apiFetch } from "~/utils/apiFetch";
import { getApiErrorStatus } from "~/utils/apiError";

function withQuery(path: string, params: URLSearchParams): string {
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export async function getAllTournaments(query?: {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<{ tournaments: TournamentListItem[]; total: number }> {
  const { limit, offset, pickems, activeOnly } = query || {};
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

  const res = await apiFetch<{ tournaments?: TournamentListItem[]; count?: number }>(
    withQuery("/tournaments", params),
    { method: "GET" },
  );

  const tournaments = res.tournaments ?? [];
  return { tournaments, total: res.count ?? tournaments.length };
}

export async function getEvents(query: {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<{ events: TournamentEvent<TournamentListItem>[]; total: number }> {
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

  const res = await apiFetch<{ events: TournamentEvent<TournamentListItem>[]; count: number }>(
    withQuery("/events", params),
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

export async function syncTournament(tournamentId: string): Promise<boolean> {
  try {
    await apiFetch(`/tournaments/${tournamentId}/sync`, {
      method: "POST",
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournaments:", error);
    return false;
  }
}

export async function getTournamentMatches(
  tournamentId: string,
): Promise<TournamentMatchListItem[]> {
  try {
    const res = await apiFetch<{ matches?: TournamentMatchListItem[] }>(
      `/tournaments/${tournamentId}/matches`,
      { method: "GET" },
    );

    return res.matches ?? [];
  } catch (error) {
    console.error("Error fetching tournament matches:", error);
    return [];
  }
}

export async function setTournamentPickemsEnabled(
  tournamentId: string,
  enabled: boolean,
): Promise<boolean> {
  try {
    await apiFetch(`/tournaments/${tournamentId}/enable-pickems`, {
      body: { enabled },
      method: "POST",
    });
    return true;
  } catch (error) {
    console.error("Error enabling tournament pick'ems:", error);
    return false;
  }
}

export async function syncTournamentAdditions(): Promise<boolean> {
  try {
    await apiFetch("/tournaments/sync/additions", {
      method: "POST",
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournament additions:", error);
    return false;
  }
}

export async function setMatchWinner(matchId: string, winnerId: string): Promise<boolean> {
  try {
    await apiFetch(`/tournaments/matches/${matchId}/winner`, {
      method: "PUT",
      body: { winnerId },
    });
    return true;
  } catch (error) {
    console.error("Error setting match winner:", error);
    return false;
  }
}
