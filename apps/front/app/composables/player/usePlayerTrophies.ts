import { tournamentStagePath } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";

export interface PlayerTrophyListItem {
  id: string;
  path: string;
  displayName: string;
  endAt: Date | string | null;
}

export function toPlayerTrophyListItem(tournament: Tournament): PlayerTrophyListItem {
  return {
    id: tournament.id,
    path: tournamentStagePath(tournament.event.slug, tournament.slug),
    displayName: tournament.event.name,
    endAt: tournament.endAt ?? null,
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
