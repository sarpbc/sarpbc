import type { ContractRole, TeamContract } from "~/types/contract";
import type { Team } from "~/types/team";

export async function getAllTeams(query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ teams: Team[]; total: number }> {
  try {
    const params: Record<string, string | number | undefined> = {
      limit: query?.limit ?? 50,
    };
    if (query?.offset && query.offset > 0) params.offset = query.offset;
    if (query?.start) params.start = query.start;
    else if (query?.search) params.name = query.search;

    const res = await apiFetch<{ teams?: Team[]; count?: number }>("/team", {
      method: "GET",
      query: params,
    });
    const teams = res.teams ?? [];
    return { teams, total: res.count ?? teams.length };
  } catch (error) {
    console.error("Error fetching teams:", error);
    return { teams: [], total: 0 };
  }
}

export async function getTeamById(id: string): Promise<Team | null> {
  try {
    const res = await apiFetch<{ team?: Team }>(`/team/${id}`, {
      method: "GET",
    });
    return res.team ?? null;
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
    const res = await apiFetch<{ team?: Team }>("/team", {
      method: "POST",
      body,
    });
    return res.team ?? null;
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
    const res = await apiFetch<{ team?: Team }>(`/team/${id}`, {
      method: "PATCH",
      body,
    });
    return res.team ?? null;
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
}

export async function deleteTeam(id: string): Promise<void> {
  try {
    await apiFetch(`/team/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
}

export async function syncTeamFromPandascore(): Promise<void> {
  try {
    await apiFetch("/team/sync", { method: "POST" });
  } catch (error) {
    console.error("Error syncing team:", error);
    throw error;
  }
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  try {
    const res = await apiFetch<{ contracts?: TeamContract[] }>(`/team/${teamId}/contract`, {
      method: "GET",
    });
    return res.contracts ?? [];
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
  try {
    const res = await apiFetch<{ contract?: TeamContract }>(`/team/${teamId}/contract`, {
      method: "POST",
      body,
    });
    return res.contract ?? null;
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
    const res = await apiFetch<{ contract?: TeamContract }>(
      `/team/${teamId}/contract/${contractId}`,
      { method: "PATCH", body },
    );
    return res.contract ?? null;
  } catch (error) {
    console.error("Error updating team contract:", error);
    throw error;
  }
}

export async function deleteTeamContract(teamId: string, contractId: string): Promise<void> {
  try {
    await apiFetch(`/team/${teamId}/contract/${contractId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting team contract:", error);
    throw error;
  }
}
