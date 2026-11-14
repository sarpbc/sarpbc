import { tournamentStagePath, isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import { getPlayerTrophies } from "~/composables/player/api";
import { getTeamTrophies } from "~/composables/team/api";
import type { EntityKind, EntityTrophyListItem } from "~/types/entity";
import type { Tournament } from "~/types/tournament";

const FETCH_TROPHIES = {
  team: getTeamTrophies,
  player: getPlayerTrophies,
} satisfies Record<EntityKind, (id: string) => Promise<Tournament[]>>;

function toTrophyListItem(tournament: Tournament): EntityTrophyListItem {
  return {
    id: tournament.id,
    path: tournamentStagePath(tournament.event.slug, tournament.slug),
    displayName: tournament.event.name,
    formatLabel: nonDefaultFormatLabel(tournament.format),
    endAt: tournament.endAt ?? null,
  };
}

export function useEntityTrophies(kind: EntityKind, entityId: MaybeRef<string | undefined>) {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData<Tournament[]>(
    () => `${kind}-trophies-${idRef.value ?? "unknown"}`,
    async () => (isNonEmptyString(idRef.value) ? await FETCH_TROPHIES[kind](idRef.value) : []),
    {
      watch: [idRef],
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
