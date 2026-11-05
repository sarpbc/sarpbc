import type { MaybeRef } from "vue";
import type { PlayerContract } from "~/types/contract";
import { createApiClient } from "~/utils/apiFetch";

interface GetPlayerContractsResponseDto {
  contracts?: PlayerContract[];
}

export function usePlayerContract() {
  const $api = createApiClient();

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

  return {
    getPlayerOldTeams,
  };
}
