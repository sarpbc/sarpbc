import type { MaybeRef } from "vue";
import type { ContractRole, PlayerContract } from "~/types/contract";

export interface CreatePlayerContractDto {
  teamId: string;
  role: ContractRole;
  startDate: string;
  endDate?: string | null;
}

export interface UpdatePlayerContractDto {
  teamId?: string;
  role?: ContractRole;
  startDate?: string;
  endDate?: string | null;
}

interface GetPlayerContractsResponseDto {
  contracts?: PlayerContract[];
}
interface UpsertPlayerContractResponseDto {
  contract: PlayerContract;
}

export function usePlayerContract() {
  const $api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase,
    credentials: "include",
  });

  function getPlayerContracts(playerId: MaybeRef<string>) {
    const playerIdRef = toRef(playerId);
    return useAsyncData(
      () => `player-contracts-${playerIdRef.value}`,
      () =>
        $api<GetPlayerContractsResponseDto>(`/player/${playerIdRef.value}/contract`).then(
          (res) => res.contracts ?? [],
        ),
      { watch: [playerIdRef], default: () => [] as PlayerContract[] },
    );
  }

  function getPlayerOldTeams(playerId: MaybeRef<string>) {
    const playerIdRef = toRef(playerId);
    return useAsyncData(
      () => `player-old-teams-${playerIdRef.value}`,
      () =>
        $api<GetPlayerContractsResponseDto>(`/player/${playerIdRef.value}/old-teams`).then(
          (res) => res.contracts ?? [],
        ),
      { watch: [playerIdRef], default: () => [] as PlayerContract[] },
    );
  }

  async function createPlayerContract(
    playerId: MaybeRef<string>,
    body: CreatePlayerContractDto,
  ): Promise<PlayerContract> {
    const res = await $api<UpsertPlayerContractResponseDto>(
      `/player/${toValue(playerId)}/contract`,
      { method: "POST", body },
    );
    return res.contract;
  }

  async function updatePlayerContract(
    playerId: MaybeRef<string>,
    contractId: MaybeRef<string>,
    body: UpdatePlayerContractDto,
  ): Promise<PlayerContract> {
    const res = await $api<UpsertPlayerContractResponseDto>(
      `/player/${toValue(playerId)}/contract/${toValue(contractId)}`,
      { method: "PATCH", body },
    );
    return res.contract;
  }

  async function deletePlayerContract(
    playerId: MaybeRef<string>,
    contractId: MaybeRef<string>,
  ): Promise<void> {
    await $api(`/player/${toValue(playerId)}/contract/${toValue(contractId)}`, {
      method: "DELETE",
    });
  }

  return {
    getPlayerContracts,
    getPlayerOldTeams,
    createPlayerContract,
    updatePlayerContract,
    deletePlayerContract,
  };
}
