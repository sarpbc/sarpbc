import type { MaybeRef } from "vue";
import type { PlayerProfileAward } from "@sarpbc/types";

export function usePlayerAwards(playerId: MaybeRef<string | undefined>) {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useAsyncData<PlayerProfileAward[]>(
    () => `player-awards-${playerIdRef.value ?? "unknown"}`,
    async () => (playerIdRef.value ? await getPlayerAwards(playerIdRef.value) : []),
    {
      watch: [playerIdRef],
      default: () => [],
    },
  );

  const awards = computed(() => data.value ?? []);

  const hasAwards = computed(() => awards.value.length > 0);

  return {
    awards,
    hasAwards,
    pending,
    error,
    refresh,
  };
}
