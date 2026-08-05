import type { Match } from "~/types/matches";
import type { Team } from "~/types/team";
import type { Tournament } from "~/types/tournament";
import type { ContractRole, TeamContract } from "~/types/contract";

export async function getTeamFromSlug(slug: string): Promise<Team | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ team?: Team }>(`${config.public.apiBase}/team/slug/${slug}`, {
      method: "GET",
      credentials: "include",
    });

    return res.team || null;
  } catch {
    return null;
  }
}

export async function getAllTeams(query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ teams: Team[]; total: number }> {
  const config = useRuntimeConfig();
  try {
    const params: Record<string, string | number | undefined> = {
      limit: query?.limit || 50,
    };

    if (query?.offset && query.offset > 0) {
      params.offset = query.offset;
    }

    if (query?.start) {
      params.start = query.start;
    } else if (query?.search) {
      params.name = query.search;
    }

    const res = await $fetch<{ teams?: Team[]; count?: number }>(`${config.public.apiBase}/team`, {
      method: "GET",
      credentials: "include",
      params,
    });

    const teams = res.teams || [];
    const total = res.count ?? teams.length;

    return {
      teams,
      total,
    };
  } catch (error) {
    console.error("Error fetching teams:", error);
    return { teams: [], total: 0 };
  }
}

export async function syncTeamFromPandascore(): Promise<void> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/team/sync`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error syncing team:", error);
  }
}

export async function getTeamFormerPlayers(teamId: string): Promise<TeamContract[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ contracts?: TeamContract[] }>(
      `${config.public.apiBase}/team/${teamId}/former-players`,
      {
        method: "GET",
        credentials: "include",
      },
    );
    return res.contracts || [];
  } catch {
    return [];
  }
}

/** Throws on failure so trophy section can render its own error state. */
export async function getTeamTrophies(teamId: string): Promise<Tournament[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ trophies?: Tournament[] }>(
    `${config.public.apiBase}/team/${teamId}/trophies`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.trophies ?? [];
}

/** Throws on failure so event sections can render their own error state. */
export async function getTeamTournaments(teamId: string): Promise<Tournament[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ tournaments?: Tournament[] }>(
    `${config.public.apiBase}/team/${teamId}/tournaments`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.tournaments ?? [];
}

/** Throws on failure so match sections can render their own error state. */
export async function getTeamMatches(teamId: string): Promise<Match[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ matches?: Match[] }>(
    `${config.public.apiBase}/tournaments/matches/team/${teamId}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.matches ?? [];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ team?: Team }>(`${config.public.apiBase}/team/${id}`, {
      method: "GET",
      credentials: "include",
    });
    return res.team || null;
  } catch (error) {
    console.error("Error fetching team by id:", error);
    return null;
  }
}

export async function createTeam(body: {
  name: string;
  location?: string;
  imageUrl?: string;
}): Promise<Team | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ team?: Team }>(`${config.public.apiBase}/team`, {
      method: "POST",
      credentials: "include",
      body,
    });
    return res.team || null;
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
}

export async function updateTeam(
  id: string,
  body: {
    name?: string;
    location?: string;
    imageUrl?: string;
  },
): Promise<Team | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ team?: Team }>(`${config.public.apiBase}/team/${id}`, {
      method: "PATCH",
      credentials: "include",
      body,
    });
    return res.team || null;
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
}

export async function deleteTeam(id: string): Promise<void> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/team/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ contracts?: TeamContract[] }>(
      `${config.public.apiBase}/team/${teamId}/contract`,
      {
        method: "GET",
        credentials: "include",
      },
    );
    return res.contracts || [];
  } catch {
    return [];
  }
}

export async function createTeamContract(
  teamId: string,
  body: {
    playerId: string;
    role: ContractRole;
    startDate: string;
    endDate?: string | null;
  },
): Promise<TeamContract | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ contract?: TeamContract }>(
      `${config.public.apiBase}/team/${teamId}/contract`,
      {
        method: "POST",
        credentials: "include",
        body,
      },
    );
    return res.contract || null;
  } catch (error) {
    console.error("Error creating team contract:", error);
    throw error;
  }
}

export async function updateTeamContract(
  teamId: string,
  contractId: string,
  body: {
    playerId?: string;
    role?: ContractRole;
    startDate?: string;
    endDate?: string | null;
  },
): Promise<TeamContract | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ contract?: TeamContract }>(
      `${config.public.apiBase}/team/${teamId}/contract/${contractId}`,
      {
        method: "PATCH",
        credentials: "include",
        body,
      },
    );
    return res.contract || null;
  } catch (error) {
    console.error("Error updating team contract:", error);
    throw error;
  }
}

export async function deleteTeamContract(teamId: string, contractId: string): Promise<void> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/team/${teamId}/contract/${contractId}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error deleting team contract:", error);
    throw error;
  }
}
