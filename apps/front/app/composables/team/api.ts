import { isNonEmptyString } from "@sarpbc/utils";
import type { ProfileEarnings, ProfileMatchListItem, Team, TeamContract } from "@sarpbc/types";
import type { Tournament } from "~/types/tournament";

export async function getTeamFromSlug(slug: string): Promise<Team | null> {
  const res = await apiFetch<{ team: Team | null }>(`/team/slug/${slug}`, {
    method: "GET",
  });

  return res.team;
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
    limit: query?.limit ?? 50,
  };

  if (query?.offset !== undefined && query.offset > 0) {
    params.offset = query.offset;
  }

  if (isNonEmptyString(query?.start)) {
    params.start = query.start;
  } else if (isNonEmptyString(query?.search)) {
    params.name = query.search;
  }

  const res = await apiFetch<{ teams: Team[]; count: number }>(`/team`, {
    method: "GET",
    query: params,
  });

  return { teams: res.teams, total: res.count };
}

export async function getTeamContracts(teamId: string): Promise<TeamContract[]> {
  const res = await apiFetch<{ contracts: TeamContract[] }>(`/team/${teamId}/contract`, {
    method: "GET",
  });

  return res.contracts;
}

export async function getTeamTrophies(teamId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ trophies: Tournament[] }>(`/team/${teamId}/trophies`, {
    method: "GET",
  });

  return res.trophies;
}

export async function getTeamEarnings(teamId: string): Promise<ProfileEarnings> {
  const res = await apiFetch<{ earnings: ProfileEarnings }>(`/team/${teamId}/earnings`, {
    method: "GET",
  });

  return res.earnings;
}

export async function getTeamTournaments(teamId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ tournaments: Tournament[] }>(`/team/${teamId}/tournaments`, {
    method: "GET",
  });

  return res.tournaments;
}

export async function getTeamMatches(teamId: string): Promise<ProfileMatchListItem[]> {
  const res = await apiFetch<{ matches: ProfileMatchListItem[] }>(
    `/tournaments/matches/team/${teamId}`,
    {
      method: "GET",
    },
  );

  return res.matches;
}
