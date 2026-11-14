import { isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import type { PlayerStandIn } from "@sarpbc/types";

export const usePlayerStandIns = (playerId: MaybeRef<string | undefined>) => {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useLazyAsyncData<PlayerStandIn[]>(
    () => `player-stand-ins-${playerIdRef.value ?? "unknown"}`,
    async () =>
      isNonEmptyString(playerIdRef.value) ? await getPlayerStandIns(playerIdRef.value) : [],
    {
      default: () => [],
      watch: [playerIdRef],
    },
  );

  const standIns = computed(() => data.value ?? []);

  const hasStandIns = computed(() => standIns.value.length > 0);

  return {
    error,
    hasStandIns,
    pending,
    refresh,
    standIns,
  };
};
