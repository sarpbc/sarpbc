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

export async function getAllTeams(query: {
  limit: number;
  offset: number;
}): Promise<{ teams: Team[]; total: number }> {
  const res = await apiFetch<{ teams: Team[]; count: number }>("/team", {
    method: "GET",
    query,
  });

  return { teams: res.teams, total: res.count };
}

export async function getEveryTeam(): Promise<Team[]> {
  const teams: Team[] = [];

  for (;;) {
    const page = await getAllTeams({ limit: MAX_PAGE_SIZE, offset: teams.length });
    teams.push(...page.teams);

    if (page.teams.length === 0 || teams.length >= page.total) return teams;
  }
}

export async function getTeamById(id: string): Promise<Team> {
  const res = await apiFetch<{ team: Team | null }>(`/team/${id}`, { method: "GET" });

  if (!res.team) throw createError({ statusCode: 404, message: "Team not found" });

  return res.team;
}

export async function createTeam(body: CreateTeamDto): Promise<Team> {
  const res = await apiFetch<{ team: Team }>("/team", { method: "POST", body });

  return res.team;
}

export async function updateTeam(id: string, body: UpdateTeamDto): Promise<Team> {
  const res = await apiFetch<{ team: Team }>(`/team/${id}`, { method: "PATCH", body });

  return res.team;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiFetch(`/team/${id}`, { method: "DELETE" });
}

export async function syncTeamFromPandascore(): Promise<void> {
  await apiFetch("/team/sync", { method: "POST" });
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  const res = await apiFetch<{ contracts: TeamContract[] }>(`/team/${teamId}/contract`, {
    method: "GET",
  });

  return res.contracts;
}

export async function createTeamContract(
  teamId: string,
  body: TeamContractDto,
): Promise<TeamContract> {
  const res = await apiFetch<{ contract: TeamContract }>(`/team/${teamId}/contract`, {
    method: "POST",
    body,
  });

  return res.contract;
}

export async function updateTeamContract(
  teamId: string,
  contractId: string,
  body: Partial<TeamContractDto>,
): Promise<TeamContract> {
  const res = await apiFetch<{ contract: TeamContract }>(`/team/${teamId}/contract/${contractId}`, {
    method: "PATCH",
    body,
  });

  return res.contract;
}

export async function deleteTeamContract(teamId: string, contractId: string): Promise<void> {
  await apiFetch(`/team/${teamId}/contract/${contractId}`, { method: "DELETE" });
}

export async function addTeamAlias(teamId: string, body: TeamAliasInput): Promise<TeamAlias> {
  const res = await apiFetch<{ alias: TeamAlias }>(`/team/${teamId}/aliases`, {
    method: "POST",
    body,
  });

  return res.alias;
}

export async function updateTeamAlias(
  teamId: string,
  aliasId: string,
  body: TeamAliasInput,
): Promise<TeamAlias> {
  const res = await apiFetch<{ alias: TeamAlias }>(`/team/${teamId}/aliases/${aliasId}`, {
    method: "PUT",
    body,
  });

  return res.alias;
}

export async function deleteTeamAlias(teamId: string, aliasId: string): Promise<void> {
  await apiFetch(`/team/${teamId}/aliases/${aliasId}`, { method: "DELETE" });
}
