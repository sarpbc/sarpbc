import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import type { PlayerAwardType, TournamentAwardListItem } from "@sarpbc/types";

export async function getAllTournaments(query?: {
  limit?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<Tournament[]> {
  const { limit, pickems, activeOnly } = query || {};
  try {
    const params: Record<string, string | number | undefined> = {};
    if (limit !== undefined) params.limit = limit;
    if (pickems !== undefined) params.pickems = pickems ? "true" : "false";
    if (activeOnly) params.activeOnly = "true";

    const res = await apiFetch<{ tournaments?: Tournament[] }>("/tournaments", {
      method: "GET",
      query: params,
    });

    return res.tournaments ?? [];
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  try {
    const res = await apiFetch<{ tournament?: Tournament }>(`/tournaments/${id}`, {
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

export async function getTournamentMatches(tournamentId: string): Promise<Match[]> {
  try {
    const res = await apiFetch<{ matches?: Match[] }>(`/tournaments/${tournamentId}/matches`, {
      method: "GET",
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

export interface TournamentLeagueOption {
  id: string;
  name: string;
}

export interface ManualTournamentInput {
  name: string;
  slug?: string;
  tier?: string;
  leagueId?: string | null;
  beginAt?: string | null;
  endAt?: string | null;
  imageUrl?: string | null;
  teamIds?: string[];
}

export async function getTournamentLeagues(): Promise<TournamentLeagueOption[]> {
  try {
    const res = await apiFetch<{ leagues?: TournamentLeagueOption[] }>("/tournaments/leagues", {
      method: "GET",
    });
    return res.leagues ?? [];
  } catch (error) {
    console.error("Error fetching tournament leagues:", error);
    return [];
  }
}

export async function createTournament(body: ManualTournamentInput): Promise<Tournament | null> {
  const res = await apiFetch<{ tournament?: Tournament }>("/tournaments", {
    method: "POST",
    body,
  });
  return res.tournament ?? null;
}

export async function updateTournament(
  id: string,
  body: ManualTournamentInput,
): Promise<Tournament | null> {
  const res = await apiFetch<{ tournament?: Tournament }>(`/tournaments/${id}`, {
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
