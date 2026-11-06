import type { ContractRole, TeamContract } from "@sarpbc/types";
import type { Team } from "@sarpbc/types";

export type CreateTeamDto = {
  name: string;
  location?: string;
  imageUrl?: string;
};

export type UpdateTeamDto = {
  name?: string;
  location?: string;
  imageUrl?: string;
};

type TeamListParams = {
  limit: number;
  offset?: number;
};

export async function getAllTeams(query?: {
  limit?: number;
  offset?: number;
}): Promise<{ teams: Team[]; total: number }> {
  try {
    const params: TeamListParams = {
      limit: query?.limit ?? 50,
    };
    if (query?.offset && query.offset > 0) params.offset = query.offset;

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

export async function createTeam(body: CreateTeamDto): Promise<Team | null> {
  const res = await apiFetch<{ team?: Team }>("/team", {
    method: "POST",
    body,
  });
  return res.team ?? null;
}

export async function updateTeam(id: string, body: UpdateTeamDto): Promise<Team | null> {
  const res = await apiFetch<{ team?: Team }>(`/team/${id}`, {
    method: "PATCH",
    body,
  });
  return res.team ?? null;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiFetch(`/team/${id}`, { method: "DELETE" });
}

export async function syncTeamFromPandascore(): Promise<void> {
  await apiFetch("/team/sync", { method: "POST" });
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
  const res = await apiFetch<{ contract?: TeamContract }>(`/team/${teamId}/contract`, {
    method: "POST",
    body,
  });
  return res.contract ?? null;
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
  const res = await apiFetch<{ contract?: TeamContract }>(
    `/team/${teamId}/contract/${contractId}`,
    { method: "PATCH", body },
  );
  return res.contract ?? null;
}

export async function deleteTeamContract(teamId: string, contractId: string): Promise<void> {
  await apiFetch(`/team/${teamId}/contract/${contractId}`, {
    method: "DELETE",
  });
}
