import { tournamentStagePath } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import type { Tournament } from "~/types/tournament";

export interface TeamTrophyListItem {
  id: string;
  path: string;
  displayName: string;
  endAt: Date | string | null;
}

function toTrophyListItem(tournament: Tournament): TeamTrophyListItem {
  return {
    id: tournament.id,
    path: tournamentStagePath(tournament.event.slug, tournament.slug),
    displayName: tournament.event.name,
    endAt: tournament.endAt ?? null,
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
