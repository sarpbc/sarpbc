import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";

export interface PlayerTrophyListItem {
  id: string;
  name: string;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
}

export function toPlayerTrophyListItem(tournament: Tournament): PlayerTrophyListItem {
  const league = typeof tournament.league === "object" ? tournament.league : undefined;

  return {
    id: tournament.id,
    name: tournament.name,
    endAt: tournament.endAt ?? null,
    leagueName: league?.name,
    serie: tournament.serie ?? null,
  };
}

export function usePlayerTrophies(playerId: MaybeRef<string | undefined>) {
  const playerIdRef = toRef(playerId);

  const { data, pending, error, refresh } = useAsyncData<Tournament[]>(
    () => `player-trophies-${playerIdRef.value ?? "unknown"}`,
    async () => (playerIdRef.value ? await getPlayerTrophies(playerIdRef.value) : []),
    {
      watch: [playerIdRef],
      default: () => [],
    },
  );

  const trophies = computed(() => (data.value ?? []).map(toPlayerTrophyListItem));

  return {
    trophies,
    pending,
    error,
    refresh,
  };
}
