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

export const getAllPlayers = async (query: { limit: number; offset: number }) => {
  const res = await apiFetch<{ players: Player[]; count: number }>("/player", {
    method: "GET",
    query: { limit: query.limit, offset: query.offset },
  });

  return { players: res.players, total: res.count };
};

export const getPlayerById = async (id: string) => {
  const res = await apiFetch<{ player: Player | null }>(`/player/${id}`, { method: "GET" });

  if (!res.player) {
    throw createError({ message: "Player not found", statusCode: 404 });
  }

  return res.player;
};

export const createPlayer = async (body: CreatePlayerDto) => {
  const res = await apiFetch<{ player: Player }>("/player", { body, method: "POST" });

  return res.player;
};

export const updatePlayer = async (id: string, body: UpdatePlayerDto) => {
  const res = await apiFetch<{ player: Player }>(`/player/${id}`, { body, method: "PATCH" });

  return res.player;
};

export const deletePlayer = async (id: string) => {
  await apiFetch(`/player/${id}`, { method: "DELETE" });
};

export const getPlayerContracts = async (playerId: string) => {
  const res = await apiFetch<{ contracts: PlayerContract[] }>(`/player/${playerId}/contract`, {
    method: "GET",
  });

  return res.contracts;
};

export const createPlayerContract = async (playerId: string, body: CreatePlayerContractDto) => {
  const res = await apiFetch<{ contract: PlayerContract }>(`/player/${playerId}/contract`, {
    body,
    method: "POST",
  });

  return res.contract;
};

export const updatePlayerContract = async (
  playerId: string,
  contractId: string,
  body: UpdatePlayerContractDto,
) => {
  const res = await apiFetch<{ contract: PlayerContract }>(
    `/player/${playerId}/contract/${contractId}`,
    { body, method: "PATCH" },
  );

  return res.contract;
};

export const deletePlayerContract = async (playerId: string, contractId: string) => {
  await apiFetch(`/player/${playerId}/contract/${contractId}`, { method: "DELETE" });
};
