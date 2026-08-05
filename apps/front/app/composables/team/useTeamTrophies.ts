import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";

export interface TeamTrophyListItem {
  id: string;
  name: string;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
}

function toTrophyListItem(tournament: Tournament): TeamTrophyListItem {
  const league = typeof tournament.league === "object" ? tournament.league : undefined;

  return {
    id: tournament.id,
    name: tournament.name,
    endAt: tournament.endAt ?? null,
    leagueName: league?.name,
    serie: tournament.serie ?? null,
  };
}

export function useTeamTrophies(teamId: MaybeRef<string | undefined>) {
  const teamIdRef = toRef(teamId);

  const { data, pending, error, refresh } = useAsyncData<Tournament[]>(
    () => `team-trophies-${teamIdRef.value ?? "unknown"}`,
    async () => (teamIdRef.value ? await getTeamTrophies(teamIdRef.value) : []),
    {
      watch: [teamIdRef],
      default: () => [],
    },
  );

  const trophies = computed(() => (data.value ?? []).map(toTrophyListItem));

  return {
    trophies,
    pending,
    error,
    refresh,
  };
}
