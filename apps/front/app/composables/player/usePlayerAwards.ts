import { isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import type { PlayerAwards } from "./api";

export function usePlayerAwards(playerId: MaybeRef<string | undefined>) {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useAsyncData<PlayerAwards>(
    () => `player-awards-${playerIdRef.value ?? "unknown"}`,
    async () =>
      isNonEmptyString(playerIdRef.value)
        ? await getPlayerAwards(playerIdRef.value)
        : { awards: [], seasonAwards: [] },
    {
      watch: [playerIdRef],
      default: () => ({ awards: [], seasonAwards: [] }),
    },
  );

  const awards = computed(() => data.value?.awards ?? []);

  const seasonAwards = computed(() => data.value?.seasonAwards ?? []);

  const hasAwards = computed(() => awards.value.length > 0 || seasonAwards.value.length > 0);

  return {
    awards,
    seasonAwards,
    hasAwards,
    pending,
    error,
    refresh,
  };
}
