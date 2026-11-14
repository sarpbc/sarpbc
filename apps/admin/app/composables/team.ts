import type { ContractRole, Team, TeamAlias, TeamAliasInput, TeamContract } from "@sarpbc/types";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";

export interface CreateTeamDto {
  name: string;
  location?: string;
  imageUrl?: string;
}

export interface UpdateTeamDto {
  name?: string;
  location?: string;
  imageUrl?: string;
}

interface TeamContractDto {
  playerId: string;
  role: ContractRole;
  startDate: string;
  endDate?: string | null;
}

export const getAllTeams = async (query: {
  limit: number;
  offset: number;
}): Promise<{ teams: Team[]; total: number }> => {
  const res = await apiFetch<{ teams: Team[]; count: number }>("/team", {
    method: "GET",
    query,
  });

  return { teams: res.teams, total: res.count };
};

export const getEveryTeam = async (): Promise<Team[]> => {
  const first = await getAllTeams({ limit: MAX_PAGE_SIZE, offset: 0 });
  const remainingPages = Math.max(Math.ceil(first.total / MAX_PAGE_SIZE) - 1, 0);

  const rest = await Promise.all(
    Array.from(
      { length: remainingPages },
      async (_, index) =>
        await getAllTeams({ limit: MAX_PAGE_SIZE, offset: (index + 1) * MAX_PAGE_SIZE }),
    ),
  );

  return [first, ...rest].flatMap(({ teams }) => teams);
};

export const getTeamById = async (id: string): Promise<Team> => {
  const res = await apiFetch<{ team: Team | null }>(`/team/${id}`, { method: "GET" });

  if (!res.team) {
    throw createError({ statusCode: 404, message: "Team not found" });
  }

  return res.team;
};

export const createTeam = async (body: CreateTeamDto): Promise<Team> => {
  const res = await apiFetch<{ team: Team }>("/team", { method: "POST", body });

  return res.team;
};

export const updateTeam = async (id: string, body: UpdateTeamDto): Promise<Team> => {
  const res = await apiFetch<{ team: Team }>(`/team/${id}`, { method: "PATCH", body });

  return res.team;
};

export const deleteTeam = async (id: string): Promise<void> => {
  await apiFetch(`/team/${id}`, { method: "DELETE" });
};

export const syncTeamFromPandascore = async (): Promise<void> => {
  await apiFetch("/team/sync", { method: "POST" });
};

export const getTeamContracts = async (teamId: string): Promise<TeamContract[]> => {
  const res = await apiFetch<{ contracts: TeamContract[] }>(`/team/${teamId}/contract`, {
    method: "GET",
  });

  return res.contracts;
};

export const createTeamContract = async (
  teamId: string,
  body: TeamContractDto,
): Promise<TeamContract> => {
  const res = await apiFetch<{ contract: TeamContract }>(`/team/${teamId}/contract`, {
    method: "POST",
    body,
  });

  return res.contract;
};

export const updateTeamContract = async (
  teamId: string,
  contractId: string,
  body: Partial<TeamContractDto>,
): Promise<TeamContract> => {
  const res = await apiFetch<{ contract: TeamContract }>(`/team/${teamId}/contract/${contractId}`, {
    method: "PATCH",
    body,
  });

  return res.contract;
};

export const deleteTeamContract = async (teamId: string, contractId: string): Promise<void> => {
  await apiFetch(`/team/${teamId}/contract/${contractId}`, { method: "DELETE" });
};

export const addTeamAlias = async (teamId: string, body: TeamAliasInput): Promise<TeamAlias> => {
  const res = await apiFetch<{ alias: TeamAlias }>(`/team/${teamId}/aliases`, {
    method: "POST",
    body,
  });

  return res.alias;
};

export const updateTeamAlias = async (
  teamId: string,
  aliasId: string,
  body: TeamAliasInput,
): Promise<TeamAlias> => {
  const res = await apiFetch<{ alias: TeamAlias }>(`/team/${teamId}/aliases/${aliasId}`, {
    method: "PUT",
    body,
  });

  return res.alias;
};

export const deleteTeamAlias = async (teamId: string, aliasId: string): Promise<void> => {
  await apiFetch(`/team/${teamId}/aliases/${aliasId}`, { method: "DELETE" });
};
