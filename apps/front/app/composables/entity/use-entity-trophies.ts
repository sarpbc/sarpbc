import { tournamentStagePath, isNonEmptyString } from "@sarpbc/utils";
import type { MaybeRef } from "vue";
import { getPlayerTrophies } from "~/composables/player/api";
import { getTeamTrophies } from "~/composables/team/api";
import type { EntityKind } from "~/types/entity";
import type { Tournament } from "~/types/tournament";

const FETCH_TROPHIES = {
  player: getPlayerTrophies,
  team: getTeamTrophies,
} satisfies Record<EntityKind, (id: string) => Promise<Tournament[]>>;

const toTrophyListItem = (tournament: Tournament) => ({
  displayName: tournament.event.name,
  endAt: tournament.endAt ?? null,
  formatLabel: nonDefaultFormatLabel(tournament.format),
  id: tournament.id,
  path: tournamentStagePath(tournament.event.slug, tournament.slug),
});

export const useEntityTrophies = (kind: EntityKind, entityId: MaybeRef<string | undefined>) => {
  const idRef = toRef(entityId);

  const { data, pending, error, refresh } = useAsyncData<Tournament[]>(
    () => `${kind}-trophies-${idRef.value ?? "unknown"}`,
    async () => (isNonEmptyString(idRef.value) ? await FETCH_TROPHIES[kind](idRef.value) : []),
    {
      default: () => [],
      watch: [idRef],
    },
  );

  const trophies = computed(() => (data.value ?? []).map(toTrophyListItem));

  return {
    error,
    pending,
    refresh,
    trophies,
  };
};
