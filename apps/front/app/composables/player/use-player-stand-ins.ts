import { isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import type { PlayerStandIn } from "@sarpbc/types";

export function usePlayerStandIns(playerId: MaybeRef<string | undefined>) {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useLazyAsyncData<PlayerStandIn[]>(
    () => `player-stand-ins-${playerIdRef.value ?? "unknown"}`,
    async () =>
      isNonEmptyString(playerIdRef.value) ? await getPlayerStandIns(playerIdRef.value) : [],
    {
      watch: [playerIdRef],
      default: () => [],
    },
  );

  const standIns = computed(() => data.value ?? []);

  const hasStandIns = computed(() => standIns.value.length > 0);

  return {
    standIns,
    hasStandIns,
    pending,
    error,
    refresh,
  };
}
