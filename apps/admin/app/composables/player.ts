import type { ContractRole, PlayerContract } from "@sarpbc/types";
import type { Player } from "@sarpbc/types";

export type CreatePlayerDto = {
  name: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
};

export type UpdatePlayerDto = {
  name?: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthday?: string;
  imageUrl?: string;
};

type CreatePlayerContractDto = {
  teamId: string;
  role: ContractRole;
  startDate: string;
  endDate?: string | null;
};

type UpdatePlayerContractDto = {
  teamId?: string;
  role?: ContractRole;
  startDate?: string;
  endDate?: string | null;
};

type PlayerListParams = {
  limit: number;
  offset?: number;
};

export async function getAllPlayers(query?: {
  limit?: number;
  offset?: number;
}): Promise<{ players: Player[]; total: number }> {
  try {
    const params: PlayerListParams = {
      limit: query?.limit ?? 50,
    };
    if (query?.offset && query.offset > 0) params.offset = query.offset;

    const res = await apiFetch<{ players?: Player[]; count?: number }>("/player", {
      method: "GET",
      query: params,
    });
    const players = res.players ?? [];
    return { players, total: res.count ?? players.length };
  } catch (error) {
    console.error("Error fetching players:", error);
    return { players: [], total: 0 };
  }
}

export async function getPlayerById(id: string): Promise<Player | null> {
  try {
    const res = await apiFetch<{ player?: Player }>(`/player/${id}`, {
      method: "GET",
    });
    return res.player ?? null;
  } catch (error) {
    console.error("Error fetching player by id:", error);
    return null;
  }
}

export async function createPlayer(body: CreatePlayerDto): Promise<Player | null> {
  const res = await apiFetch<{ player?: Player }>("/player", {
    method: "POST",
    body,
  });
  return res.player ?? null;
}

export async function updatePlayer(id: string, body: UpdatePlayerDto): Promise<Player | null> {
  const res = await apiFetch<{ player?: Player }>(`/player/${id}`, {
    method: "PATCH",
    body,
  });
  return res.player ?? null;
}

export async function deletePlayer(id: string): Promise<void> {
  await apiFetch(`/player/${id}`, { method: "DELETE" });
}

export async function getPlayerContracts(playerId: string): Promise<PlayerContract[]> {
  try {
    const res = await apiFetch<{ contracts?: PlayerContract[] }>(`/player/${playerId}/contract`, {
      method: "GET",
    });
    return res.contracts ?? [];
  } catch {
    return [];
  }
}

export async function createPlayerContract(
  playerId: string,
  body: CreatePlayerContractDto,
): Promise<PlayerContract | null> {
  const res = await apiFetch<{ contract?: PlayerContract }>(`/player/${playerId}/contract`, {
    method: "POST",
    body,
  });
  return res.contract ?? null;
}

export async function updatePlayerContract(
  playerId: string,
  contractId: string,
  body: UpdatePlayerContractDto,
): Promise<PlayerContract | null> {
  const res = await apiFetch<{ contract?: PlayerContract }>(
    `/player/${playerId}/contract/${contractId}`,
    { method: "PATCH", body },
  );
  return res.contract ?? null;
}

export async function deletePlayerContract(playerId: string, contractId: string): Promise<void> {
  await apiFetch(`/player/${playerId}/contract/${contractId}`, {
    method: "DELETE",
  });
}
