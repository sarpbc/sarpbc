import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

export async function getAllTournaments(query?: {
  limit?: number;
  pickems?: boolean;
  activeOnly?: boolean;
}): Promise<Tournament[]> {
  const config = useRuntimeConfig();
  const { limit, pickems, activeOnly } = query || {};
  try {
    const url = new URL(`${config.public.apiBase}/tournaments`);
    if (limit !== undefined) {
      url.searchParams.set("limit", String(limit));
    }
    if (pickems !== undefined) {
      url.searchParams.set("pickems", pickems ? "true" : "false");
    }
    if (activeOnly) {
      url.searchParams.set("activeOnly", "true");
    }

    const res = await $fetch<{ tournaments?: Tournament[] }>(url.toString(), {
      method: "GET",
      credentials: "include",
    });

    return res.tournaments ?? [];
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const config = useRuntimeConfig();
  try {
    const url = new URL(`${config.public.apiBase}/tournaments/${id}`);

    const res = await $fetch<{ tournament?: Tournament }>(url.toString(), {
      method: "GET",
      credentials: "include",
    });

    return res.tournament ?? null;
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return null;
  }
}

export async function syncTournament(tournamentId: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    const url = new URL(`${config.public.apiBase}/tournaments/${tournamentId}/sync`);

    await $fetch(url.toString(), {
      method: "POST",
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournaments:", error);
    return false;
  }
}

export async function getTournamentMatches(tournamentId: string) {
  const config = useRuntimeConfig();
  try {
    const url = new URL(`${config.public.apiBase}/tournaments/${tournamentId}/matches`);

    const res = await $fetch<{ matches?: Match[] }>(url.toString(), {
      method: "GET",
      credentials: "include",
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
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/tournaments/${tournamentId}/enable-pickems`, {
      body: { enabled },
      method: "POST",
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error enabling tournament pick'ems:", error);
    return false;
  }
}

export async function syncTournamentAdditions(): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/tournaments/sync/additions`, {
      method: "POST",
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error syncing tournament additions:", error);
    return false;
  }
}

export async function setMatchWinner(matchId: string, winnerId: string): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/tournaments/matches/${matchId}/winner`, {
      method: "PUT",
      body: { winnerId },
      credentials: "include",
    });
    return true;
  } catch (error) {
    console.error("Error setting match winner:", error);
    return false;
  }
}
