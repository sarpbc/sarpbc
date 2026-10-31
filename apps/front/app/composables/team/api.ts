import type { ProfileEarnings, ProfileMatchListItem } from "@sarpbc/types";
import type { Team } from "~/types/team";
import type { Tournament } from "~/types/tournament";
import type { ContractRole, TeamContract } from "~/types/contract";
import { apiFetch } from "~/utils/apiFetch";

export async function getTeamFromSlug(slug: string): Promise<Team | null> {
  const res = await apiFetch<{ team?: Team }>(`/team/slug/${slug}`, {
    method: "GET",
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

  const res = await apiFetch<{ teams?: Team[]; count?: number }>(`/team`, {
    method: "GET",
    params,
  });

  const teams = res.teams || [];
  return { teams, total: res.count ?? teams.length };
}

export async function syncTeamFromPandascore(): Promise<void> {
  try {
    await apiFetch(`/team/sync`, {
      method: "POST",
    });
  } catch (error) {
    console.error("Error syncing team:", error);
  }
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  const res = await apiFetch<{ contracts?: TeamContract[] }>(`/team/${teamId}/contract`, {
    method: "GET",
  });

  return res.contracts ?? [];
}
export async function getTeamTrophies(teamId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ trophies?: Tournament[] }>(`/team/${teamId}/trophies`, {
    method: "GET",
  });

  return res.trophies ?? [];
}

export async function getTeamEarnings(teamId: string): Promise<ProfileEarnings> {
  const res = await apiFetch<{ earnings: ProfileEarnings }>(`/team/${teamId}/earnings`, {
    method: "GET",
  });

  return res.earnings;
}

export async function getTeamTournaments(teamId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(`/team/${teamId}/tournaments`, {
    method: "GET",
  });

  return res.tournaments ?? [];
}

export async function getTeamMatches(teamId: string): Promise<ProfileMatchListItem[]> {
  const res = await apiFetch<{ matches?: ProfileMatchListItem[] }>(
    `/tournaments/matches/team/${teamId}`,
    {
      method: "GET",
    },
  );

  return res.matches ?? [];
}

export async function getTeamById(id: string): Promise<Team | null> {
  try {
    const res = await apiFetch<{ team?: Team }>(`/team/${id}`, {
      method: "GET",
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
    const res = await apiFetch<{ team?: Team }>(`/team`, {
      method: "POST",
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
    const res = await apiFetch<{ team?: Team }>(`/team/${id}`, {
      method: "PATCH",
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
    await apiFetch(`/team/${id}`, {
      method: "DELETE",
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
    const res = await apiFetch<{ contract?: TeamContract }>(`/team/${teamId}/contract`, {
      method: "POST",
      body,
    });
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
    const res = await apiFetch<{ contract?: TeamContract }>(
      `/team/${teamId}/contract/${contractId}`,
      {
        method: "PATCH",
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
    await apiFetch(`/team/${teamId}/contract/${contractId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting team contract:", error);
    throw error;
  }
}
