import { isNonEmptyString } from "@sarpbc/utils";
import type { Tournament } from "~/types/tournament";
import type {
  Player,
  PlayerComparison,
  PlayerContract,
  PlayerProfileAward,
  PlayerSeasonAward,
  PlayerStandIn,
  ProfileEarnings,
  ProfileMatchListItem,
} from "@sarpbc/types";

export const getPlayerFromSlug = async (slug: string): Promise<Player | null> => {
  const res = await apiFetch<{ player?: Player }>(`/player/slug/${slug}`, { method: "GET" });

  return res.player ?? null;
};

interface PlayerListParams {
  limit: number;
  offset?: number;
  start?: string;
  name?: string;
}

export const getAllPlayers = async (query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ players: Player[]; total: number }> => {
  const params: PlayerListParams = { limit: query?.limit ?? 50 };

  if (query?.offset !== undefined && query.offset > 0) {
    params.offset = query.offset;
  }

  if (isNonEmptyString(query?.start)) {
    params.start = query.start;
  } else if (isNonEmptyString(query?.search)) {
    params.name = query.search;
  }

  const res = await apiFetch<{ players?: Player[]; count?: number }>("/player", {
    method: "GET",
    query: params,
  });

  const players = res.players ?? [];

  return { players, total: res.count ?? players.length };
};

export const getPlayerOldTeams = async (playerId: string): Promise<PlayerContract[]> => {
  const res = await apiFetch<{ contracts?: PlayerContract[] }>(`/player/${playerId}/old-teams`, {
    method: "GET",
  });

  return res.contracts ?? [];
};

export const getPlayerContracts = async (playerId: string): Promise<PlayerContract[]> => {
  const res = await apiFetch<{ contracts?: PlayerContract[] }>(`/player/${playerId}/contract`, {
    method: "GET",
  });

  return res.contracts ?? [];
};

export const getPlayerStaffTournaments = async (playerId: string): Promise<Tournament[]> => {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(
    `/player/${playerId}/staff-tournaments`,
    { method: "GET" },
  );

  return res.tournaments ?? [];
};

export const getPlayerMatches = async (playerId: string): Promise<ProfileMatchListItem[]> => {
  const res = await apiFetch<{ matches?: ProfileMatchListItem[] }>(`/player/${playerId}/matches`, {
    method: "GET",
  });

  return res.matches ?? [];
};

export const getPlayerTrophies = async (playerId: string): Promise<Tournament[]> => {
  const res = await apiFetch<{ trophies?: Tournament[] }>(`/player/${playerId}/trophies`, {
    method: "GET",
  });

  return res.trophies ?? [];
};

export interface PlayerAwards {
  awards: PlayerProfileAward[];
  seasonAwards: PlayerSeasonAward[];
}

export const getPlayerAwards = async (playerId: string): Promise<PlayerAwards> => {
  const res = await apiFetch<Partial<PlayerAwards>>(`/player/${playerId}/awards`, {
    method: "GET",
  });

  return { awards: res.awards ?? [], seasonAwards: res.seasonAwards ?? [] };
};

export const getPlayerStandIns = async (playerId: string): Promise<PlayerStandIn[]> => {
  const res = await apiFetch<{ standIns: PlayerStandIn[] }>(`/player/${playerId}/stand-ins`, {
    method: "GET",
  });

  return res.standIns;
};

export const getPlayerEarnings = async (playerId: string): Promise<ProfileEarnings> => {
  const res = await apiFetch<{ earnings: ProfileEarnings }>(`/player/${playerId}/earnings`, {
    method: "GET",
  });

  return res.earnings;
};

export const getPlayerTournaments = async (playerId: string): Promise<Tournament[]> => {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(`/player/${playerId}/tournaments`, {
    method: "GET",
  });

  return res.tournaments ?? [];
};

export const getPlayerComparison = async (a: string, b: string): Promise<PlayerComparison> => {
  const res = await apiFetch<{ comparison: PlayerComparison }>("/player/compare", {
    method: "GET",
    query: { a, b },
  });

  return res.comparison;
};
