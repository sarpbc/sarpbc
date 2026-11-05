import type {
  PlayerAwardType,
  StatsImport,
  TournamentAwardListItem,
  TournamentDetail,
  TournamentListItem,
  TournamentMatchListItem,
  TournamentPrizes,
} from "@sarpbc/types";

export async function getAllTournaments(query?: {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<{ tournaments: TournamentListItem[]; total: number }> {
  const { limit, offset, pickems, activeOnly } = query || {};
  try {
    const params: Record<string, string | number | undefined> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    if (pickems !== undefined) params.pickems = pickems ? "true" : "false";
    if (activeOnly) params.activeOnly = "true";

    const res = await apiFetch<{ tournaments?: TournamentListItem[]; count?: number }>(
      "/tournaments",
      {
        method: "GET",
        query: params,
      },
    );

    const tournaments = res.tournaments ?? [];
    return {
      tournaments,
      total: res.count ?? tournaments.length,
    };
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return { tournaments: [], total: 0 };
  }
}

export async function getTournamentById(id: string): Promise<TournamentDetail | null> {
  try {
    const res = await apiFetch<{ tournament?: TournamentDetail }>(`/tournaments/${id}`, {
      method: "GET",
    });
    return res.tournament ?? null;
  } catch (error) {
    console.error("Error fetching tournament by id:", error);
    return null;
  }
}

export async function syncTournament(tournamentId: string): Promise<boolean> {
  try {
    await apiFetch(`/tournaments/${tournamentId}/sync`, {
      method: "POST",
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournament:", error);
    return false;
  }
}

export async function getTournamentMatches(
  tournamentId: string,
): Promise<TournamentMatchListItem[]> {
  try {
    const res = await apiFetch<{ matches?: TournamentMatchListItem[] }>(
      `/tournaments/${tournamentId}/matches`,
      {
        method: "GET",
      },
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
      method: "POST",
      body: { enabled },
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

export async function getTournamentsWithoutMatches(): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch<{ tournaments?: { id: string; name: string }[] }>(
    "/tournaments/without-matches",
    { method: "GET" },
  );
  return res.tournaments ?? [];
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

export interface TournamentLeague {
  id: string;
  pandascoreId: number | null;
  name: string;
  slug: string | null;
  url: string | null;
  imageUrl: string | null;
}

/** A manual league can share its name with a synced one, so synced options say where they come from. */
export function leagueOptions(leagues: TournamentLeague[], pandascoreLabel: string) {
  return leagues.map((league) => ({
    value: league.id,
    label: league.pandascoreId === null ? league.name : `${league.name} · ${pandascoreLabel}`,
  }));
}

export interface LeagueInput {
  name?: string;
  slug?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}

export interface ManualEvent {
  id: string;
  slug: string;
  name: string;
  league: { id: string; name: string } | null;
  beginAt: string | null;
  endAt: string | null;
  editable: boolean;
  stages: TournamentListItem[];
}

export interface EventInput {
  name?: string;
  slug?: string;
  leagueId?: string | null;
}

export interface ManualTournamentInput {
  name: string;
  eventId?: string;
  slug?: string;
  tier?: string | null;
  leagueId?: string | null;
  beginAt?: string | null;
  endAt?: string | null;
  imageUrl?: string | null;
  teamIds?: string[];
}

export async function getTournamentLeagues(): Promise<TournamentLeague[]> {
  const res = await apiFetch<{ leagues: TournamentLeague[] }>("/tournaments/leagues", {
    method: "GET",
  });
  return res.leagues;
}

export async function createLeague(body: LeagueInput): Promise<TournamentLeague> {
  const res = await apiFetch<{ league: TournamentLeague }>("/tournaments/leagues", {
    method: "POST",
    body,
  });
  return res.league;
}

export async function updateLeague(id: string, body: LeagueInput): Promise<TournamentLeague> {
  const res = await apiFetch<{ league: TournamentLeague }>(`/tournaments/leagues/${id}`, {
    method: "PATCH",
    body,
  });
  return res.league;
}

export async function getManualEvents(): Promise<ManualEvent[]> {
  const res = await apiFetch<{ events: ManualEvent[] }>("/events/manual", { method: "GET" });
  return res.events;
}

export async function getManualEvent(id: string): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/manual/${id}`, { method: "GET" });
  return res.event;
}

export async function createEvent(body: EventInput): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>("/events", { method: "POST", body });
  return res.event;
}

export async function updateEvent(id: string, body: EventInput): Promise<ManualEvent> {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/${id}`, { method: "PATCH", body });
  return res.event;
}

export async function createTournament(
  body: ManualTournamentInput,
): Promise<TournamentDetail | null> {
  const res = await apiFetch<{ tournament?: TournamentDetail }>("/tournaments", {
    method: "POST",
    body,
  });
  return res.tournament ?? null;
}

export async function updateTournament(
  id: string,
  body: Partial<ManualTournamentInput>,
): Promise<TournamentDetail | null> {
  const res = await apiFetch<{ tournament?: TournamentDetail }>(`/tournaments/${id}`, {
    method: "PATCH",
    body,
  });
  return res.tournament ?? null;
}

export async function getTournamentAwards(
  tournamentId: string,
): Promise<TournamentAwardListItem[]> {
  try {
    const res = await apiFetch<{ awards?: TournamentAwardListItem[] }>(
      `/tournaments/${tournamentId}/awards`,
      { method: "GET" },
    );
    return res.awards ?? [];
  } catch (error) {
    console.error("Error fetching tournament awards:", error);
    return [];
  }
}

export async function createTournamentAward(
  tournamentId: string,
  payload: { participantId: string; playerId: string; awardType: PlayerAwardType },
): Promise<TournamentAwardListItem | null> {
  try {
    const res = await apiFetch<{ award?: TournamentAwardListItem }>(
      `/tournaments/${tournamentId}/awards`,
      {
        method: "POST",
        body: payload,
      },
    );
    return res.award ?? null;
  } catch (error) {
    console.error("Error creating tournament award:", error);
    return null;
  }
}

export async function deleteTournamentAward(
  tournamentId: string,
  awardId: string,
): Promise<boolean> {
  try {
    await apiFetch(`/tournaments/${tournamentId}/awards/${awardId}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting tournament award:", error);
    return false;
  }
}

export interface TournamentPrizeInput {
  placement: number;
  amount: number;
  currency: string;
  teamId: string;
  playerIds: string[];
}

export async function getTournamentPrizes(tournamentId: string): Promise<TournamentPrizes> {
  return apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });
}

export async function setTournamentPrizes(
  tournamentId: string,
  prizes: TournamentPrizeInput[],
): Promise<TournamentPrizes> {
  return apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, {
    method: "PUT",
    body: { prizes },
  });
}

export async function getStatsImports(tournamentId: string): Promise<StatsImport[]> {
  const res = await apiFetch<{ imports: StatsImport[] }>(
    `/tournaments/${tournamentId}/stats-imports`,
    { method: "GET" },
  );
  return res.imports;
}

export async function requestStatsImport(
  tournamentId: string,
  group: string,
): Promise<StatsImport> {
  return apiFetch<StatsImport>(`/tournaments/${tournamentId}/stats-imports`, {
    method: "POST",
    body: { group },
  });
}
