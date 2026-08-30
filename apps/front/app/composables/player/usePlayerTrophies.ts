import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";
import { tournamentEventDisplayName } from "~/utils/tournamentEventDisplayName";

export interface PlayerTrophyListItem {
  id: string;
  name: string;
  displayName: string;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
}

export function toPlayerTrophyListItem(tournament: Tournament): PlayerTrophyListItem {
  const league = tournament.league instanceof Object ? tournament.league : undefined;
  const leagueName = league?.name;
  const serie = tournament.serie ?? null;

  return {
    id: tournament.id,
    name: tournament.name,
    displayName: tournamentEventDisplayName({
      name: tournament.name,
      leagueName,
      serie,
    }),
    endAt: tournament.endAt ?? null,
    leagueName,
    serie,
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
