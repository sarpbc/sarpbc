import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";
import { tournamentEventDisplayName } from "~/utils/tournamentEventDisplayName";

export interface TeamTrophyListItem {
  id: string;
  name: string;
  displayName: string;
  endAt: Date | string | null;
  leagueName?: string;
  serie?: string | null;
}

function toTrophyListItem(tournament: Tournament): TeamTrophyListItem {
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
