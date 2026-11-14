import type { ContractRole, Player, PlayerContract } from "@sarpbc/types";

export interface CreatePlayerDto {
  name: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
}

export interface UpdatePlayerDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
}

interface CreatePlayerContractDto {
  teamId: string;
  role: ContractRole;
  startDate: string;
  endDate?: string | null;
}

interface UpdatePlayerContractDto {
  teamId?: string;
  role?: ContractRole;
  startDate?: string;
  endDate?: string | null;
}

export async function getAllPlayers(query: {
  limit: number;
  offset: number;
}): Promise<{ players: Player[]; total: number }> {
  const res = await apiFetch<{ players: Player[]; count: number }>("/player", {
    method: "GET",
    query,
  });

  return { players: res.players, total: res.count };
}

export async function getPlayerById(id: string): Promise<Player> {
  const res = await apiFetch<{ player: Player | null }>(`/player/${id}`, { method: "GET" });

  if (!res.player) throw createError({ statusCode: 404, message: "Player not found" });

  return res.player;
}

export async function createPlayer(body: CreatePlayerDto): Promise<Player> {
  const res = await apiFetch<{ player: Player }>("/player", { method: "POST", body });

  return res.player;
}

export async function updatePlayer(id: string, body: UpdatePlayerDto): Promise<Player> {
  const res = await apiFetch<{ player: Player }>(`/player/${id}`, { method: "PATCH", body });

  return res.player;
}

export async function deletePlayer(id: string): Promise<void> {
  await apiFetch(`/player/${id}`, { method: "DELETE" });
}

export async function getPlayerContracts(playerId: string): Promise<PlayerContract[]> {
  const res = await apiFetch<{ contracts: PlayerContract[] }>(`/player/${playerId}/contract`, {
    method: "GET",
  });

  return res.contracts;
}

export async function createPlayerContract(
  playerId: string,
  body: CreatePlayerContractDto,
): Promise<PlayerContract> {
  const res = await apiFetch<{ contract: PlayerContract }>(`/player/${playerId}/contract`, {
    method: "POST",
    body,
  });

  return res.contract;
}

export async function updatePlayerContract(
  playerId: string,
  contractId: string,
  body: UpdatePlayerContractDto,
): Promise<PlayerContract> {
  const res = await apiFetch<{ contract: PlayerContract }>(
    `/player/${playerId}/contract/${contractId}`,
    { method: "PATCH", body },
  );

  return res.contract;
}

export async function deletePlayerContract(playerId: string, contractId: string): Promise<void> {
  await apiFetch(`/player/${playerId}/contract/${contractId}`, { method: "DELETE" });
}
