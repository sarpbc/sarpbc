import type { ProfileMatchListItem } from "@sarpbc/types";
import type { Team } from "~/types/team";
import type { Tournament } from "~/types/tournament";
import type { ContractRole, TeamContract } from "~/types/contract";

export async function getTeamFromSlug(slug: string): Promise<Team | null> {
  const res = await $fetch<{ team?: Team }>(`${useApiBase()}/team/slug/${slug}`, {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });

  return res.team || null;
}

interface TeamListParams {
  limit: number;
  offset?: number;
  start?: string;
  name?: string;
}

export async function getAllTeams(query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ teams: Team[]; total: number }> {
  const params: TeamListParams = {
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

  const res = await $fetch<{ teams?: Team[]; count?: number }>(`${useApiBase()}/team`, {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
    params,
  });

  const teams = res.teams || [];
  return { teams, total: res.count ?? teams.length };
}

export async function syncTeamFromPandascore(): Promise<void> {
  try {
    await $fetch(`${useApiBase()}/team/sync`, {
      method: "POST",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
  } catch (error) {
    console.error("Error syncing team:", error);
  }
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  const res = await $fetch<{ contracts?: TeamContract[] }>(
    `${useApiBase()}/team/${teamId}/contract`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.contracts ?? [];
}
export async function getTeamTrophies(teamId: string): Promise<Tournament[]> {
  const res = await $fetch<{ trophies?: Tournament[] }>(`${useApiBase()}/team/${teamId}/trophies`, {
    method: "GET",
    credentials: "include",
    headers: useInternalApiHeaders(),
  });

  return res.trophies ?? [];
}

export async function getTeamTournaments(teamId: string): Promise<Tournament[]> {
  const res = await $fetch<{ tournaments?: Tournament[] }>(
    `${useApiBase()}/team/${teamId}/tournaments`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.tournaments ?? [];
}

export async function getTeamMatches(teamId: string): Promise<ProfileMatchListItem[]> {
  const res = await $fetch<{ matches?: ProfileMatchListItem[] }>(
    `${useApiBase()}/tournaments/matches/team/${teamId}`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.matches ?? [];
}

export async function getTeamById(id: string): Promise<Team | null> {
  try {
    const res = await $fetch<{ team?: Team }>(`${useApiBase()}/team/${id}`, {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
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
  try {
    const res = await $fetch<{ team?: Team }>(`${useApiBase()}/team`, {
      method: "POST",
      credentials: "include",
      headers: useInternalApiHeaders(),
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
  try {
    const res = await $fetch<{ team?: Team }>(`${useApiBase()}/team/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: useInternalApiHeaders(),
      body,
    });
    return res.team || null;
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
}

export async function deleteTeam(id: string): Promise<void> {
  try {
    await $fetch(`${useApiBase()}/team/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
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
  try {
    const res = await $fetch<{ contract?: TeamContract }>(
      `${useApiBase()}/team/${teamId}/contract`,
      {
        method: "POST",
        credentials: "include",
        headers: useInternalApiHeaders(),
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
  try {
    const res = await $fetch<{ contract?: TeamContract }>(
      `${useApiBase()}/team/${teamId}/contract/${contractId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: useInternalApiHeaders(),
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
  try {
    await $fetch(`${useApiBase()}/team/${teamId}/contract/${contractId}`, {
      method: "DELETE",
      credentials: "include",
      headers: useInternalApiHeaders(),
    });
  } catch (error) {
    console.error("Error deleting team contract:", error);
    throw error;
  }
}
