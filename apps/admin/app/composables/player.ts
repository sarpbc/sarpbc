import type { ContractRole, PlayerContract } from "~/types/contract";
import type { Player } from "~/types/player";

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

export type CreatePlayerContractDto = {
  teamId: string;
  role: ContractRole;
  startDate: string;
  endDate?: string | null;
};

export type UpdatePlayerContractDto = {
  teamId?: string;
  role?: ContractRole;
  startDate?: string;
  endDate?: string | null;
};

export async function getAllPlayers(query?: {
  limit?: number;
  search?: string;
  offset?: number;
  start?: string;
}): Promise<{ players: Player[]; total: number }> {
  try {
    const params: Record<string, string | number | undefined> = {
      limit: query?.limit ?? 50,
    };
    if (query?.offset && query.offset > 0) params.offset = query.offset;
    if (query?.start) params.start = query.start;
    else if (query?.search) params.name = query.search;

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
  try {
    const res = await apiFetch<{ player?: Player }>("/player", {
      method: "POST",
      body,
    });
    return res.player ?? null;
  } catch (error) {
    console.error("Error creating player:", error);
    throw error;
  }
}

export async function updatePlayer(id: string, body: UpdatePlayerDto): Promise<Player | null> {
  try {
    const res = await apiFetch<{ player?: Player }>(`/player/${id}`, {
      method: "PATCH",
      body,
    });
    return res.player ?? null;
  } catch (error) {
    console.error("Error updating player:", error);
    throw error;
  }
}

export async function deletePlayer(id: string): Promise<void> {
  try {
    await apiFetch(`/player/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error deleting player:", error);
    throw error;
  }
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
  try {
    const res = await apiFetch<{ contract?: PlayerContract }>(`/player/${playerId}/contract`, {
      method: "POST",
      body,
    });
    return res.contract ?? null;
  } catch (error) {
    console.error("Error creating player contract:", error);
    throw error;
  }
}

export async function updatePlayerContract(
  playerId: string,
  contractId: string,
  body: UpdatePlayerContractDto,
): Promise<PlayerContract | null> {
  try {
    const res = await apiFetch<{ contract?: PlayerContract }>(
      `/player/${playerId}/contract/${contractId}`,
      { method: "PATCH", body },
    );
    return res.contract ?? null;
  } catch (error) {
    console.error("Error updating player contract:", error);
    throw error;
  }
}

export async function deletePlayerContract(playerId: string, contractId: string): Promise<void> {
  try {
    await apiFetch(`/player/${playerId}/contract/${contractId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting player contract:", error);
    throw error;
  }
}
