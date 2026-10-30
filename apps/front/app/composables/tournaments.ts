import type { TournamentDetail, TournamentListItem, TournamentMatchListItem } from "@sarpbc/types";
import type { TournamentEvent, TournamentPathResponse } from "~/types/tournament";
import { getApiErrorStatus } from "~/utils/apiError";

export async function getAllTournaments(query?: {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<{ tournaments: TournamentListItem[]; total: number }> {
  const { limit, offset, pickems, activeOnly } = query || {};
  const url = new URL(`${useApiBase()}/tournaments`);
  if (limit !== undefined) {
    url.searchParams.set("limit", String(limit));
  }
  if (offset !== undefined) {
    url.searchParams.set("offset", String(offset));
  }
  if (pickems !== undefined) {
    url.searchParams.set("pickems", pickems ? "true" : "false");
  }
  if (activeOnly) {
    url.searchParams.set("activeOnly", "true");
  }

  const res = await $fetch<{ tournaments?: TournamentListItem[]; count?: number }>(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });

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
  const url = new URL(`${useApiBase()}/events`);
  if (limit !== undefined) {
    url.searchParams.set("limit", String(limit));
  }
  if (offset !== undefined) {
    url.searchParams.set("offset", String(offset));
  }
  if (pickems !== undefined) {
    url.searchParams.set("pickems", pickems ? "true" : "false");
  }
  if (activeOnly) {
    url.searchParams.set("activeOnly", "true");
  }

  const res = await $fetch<{ events: TournamentEvent<TournamentListItem>[]; count: number }>(
    url.toString(),
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return { events: res.events, total: res.count };
}

/** Resolves `/tournaments/{segments}`, legacy stage ids included. A 404 resolves to null. */
export async function resolveTournamentPath(
  segments: readonly string[],
): Promise<TournamentPathResponse | null> {
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");

  try {
    return await $fetch<TournamentPathResponse>(`${useApiBase()}/events/resolve/${path}`, {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
  } catch (cause) {
    if (getApiErrorStatus(cause) === 404) {
      return null;
    }
    throw cause;
  }
}

export async function getTournamentById(id: string): Promise<TournamentDetail | null> {
  const url = new URL(`${useApiBase()}/tournaments/${id}`);

  try {
    const res = await $fetch<{ tournament?: TournamentDetail }>(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
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
    const url = new URL(`${useApiBase()}/tournaments/${tournamentId}/sync`);

    await $fetch(url.toString(), {
      method: "POST",
      credentials: "include",
      headers: useInternalApiHeaders(),
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
    const url = new URL(`${useApiBase()}/tournaments/${tournamentId}/matches`);

    const res = await $fetch<{ matches?: TournamentMatchListItem[] }>(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });

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
    await $fetch(`${useApiBase()}/tournaments/${tournamentId}/enable-pickems`, {
      body: { enabled },
      method: "POST",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
    return true;
  } catch (error) {
    console.error("Error enabling tournament pick'ems:", error);
    return false;
  }
}

export async function syncTournamentAdditions(): Promise<boolean> {
  try {
    await $fetch(`${useApiBase()}/tournaments/sync/additions`, {
      method: "POST",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournament additions:", error);
    return false;
  }
}

export async function setMatchWinner(matchId: string, winnerId: string): Promise<boolean> {
  try {
    await $fetch(`${useApiBase()}/tournaments/matches/${matchId}/winner`, {
      method: "PUT",
      body: { winnerId },
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
    return true;
  } catch (error) {
    console.error("Error setting match winner:", error);
    return false;
  }
}
