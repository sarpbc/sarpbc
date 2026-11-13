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

export async function getPlayerFromSlug(slug: string): Promise<Player | null> {
  const res = await apiFetch<{ player?: Player }>(`/player/slug/${slug}`, { method: "GET" });

  return res.player ?? null;
}

interface PlayerListParams {
  limit: number;
  offset?: number;
  start?: string;
  name?: string;
}

export async function getAllPlayers(query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ players: Player[]; total: number }> {
  const params: PlayerListParams = { limit: query?.limit ?? 50 };

  if (query?.offset && query.offset > 0) {
    params.offset = query.offset;
  }

  if (query?.start) {
    params.start = query.start;
  } else if (query?.search) {
    params.name = query.search;
  }

  const res = await apiFetch<{ players?: Player[]; count?: number }>("/player", {
    method: "GET",
    params,
  });
  const players = res.players ?? [];

  return { players, total: res.count ?? players.length };
}

export async function getPlayerOldTeams(playerId: string): Promise<PlayerContract[]> {
  const res = await apiFetch<{ contracts?: PlayerContract[] }>(`/player/${playerId}/old-teams`, {
    method: "GET",
  });

  return res.contracts ?? [];
}

export async function getPlayerContracts(playerId: string): Promise<PlayerContract[]> {
  const res = await apiFetch<{ contracts?: PlayerContract[] }>(`/player/${playerId}/contract`, {
    method: "GET",
  });

  return res.contracts ?? [];
}

export async function getPlayerStaffTournaments(playerId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(
    `/player/${playerId}/staff-tournaments`,
    { method: "GET" },
  );

  return res.tournaments ?? [];
}

export async function getPlayerMatches(playerId: string): Promise<ProfileMatchListItem[]> {
  const res = await apiFetch<{ matches?: ProfileMatchListItem[] }>(`/player/${playerId}/matches`, {
    method: "GET",
  });

  return res.matches ?? [];
}

export async function getPlayerTrophies(playerId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ trophies?: Tournament[] }>(`/player/${playerId}/trophies`, {
    method: "GET",
  });

  return res.trophies ?? [];
}

export interface PlayerAwards {
  awards: PlayerProfileAward[];
  seasonAwards: PlayerSeasonAward[];
}

export async function getPlayerAwards(playerId: string): Promise<PlayerAwards> {
  const res = await apiFetch<Partial<PlayerAwards>>(`/player/${playerId}/awards`, {
    method: "GET",
  });

  return { awards: res.awards ?? [], seasonAwards: res.seasonAwards ?? [] };
}

export async function getPlayerStandIns(playerId: string): Promise<PlayerStandIn[]> {
  const res = await apiFetch<{ standIns: PlayerStandIn[] }>(`/player/${playerId}/stand-ins`, {
    method: "GET",
  });

  return res.standIns;
}

export async function getPlayerEarnings(playerId: string): Promise<ProfileEarnings> {
  const res = await apiFetch<{ earnings: ProfileEarnings }>(`/player/${playerId}/earnings`, {
    method: "GET",
  });

  return res.earnings;
}

export async function getPlayerTournaments(playerId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(`/player/${playerId}/tournaments`, {
    method: "GET",
  });

  return res.tournaments ?? [];
}

export async function getPlayerComparison(a: string, b: string): Promise<PlayerComparison> {
  const res = await apiFetch<{ comparison: PlayerComparison }>("/player/compare", {
    method: "GET",
    params: { a, b },
  });

  return res.comparison;
}
