<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";

const { tournament, to } = defineProps<{
  tournament: Tournament;
  to?: string;
}>();

const localePath = useLocalePath();
const { t } = useI18n();
const { formatTournamentPrizepool } = useCurrency();

const href = computed(() => to ?? localePath(`/tournaments/${tournament.id}`));

const showImage = computed(
  () => tournament.tier === "s" && Boolean(tournament.league?.imageUrl?.trim()),
);

const displayName = computed(() =>
  [tournament.league?.name, tournament.name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" "),
);

const teamsLabel = computed(() => {
  const count = tournament.participants?.length ?? 0;
  return `${count} ${t("general.teams").toLocaleLowerCase()}`;
});

const prizeLabel = computed(
  () =>
    formatTournamentPrizepool(tournament.prizepool) || t("components.tournaments.prizepoolOther"),
);

const typeLabel = computed(() => t(`components.tournaments.${tournament.type}`));
</script>

<template>
  <UiListItem
    :size="showImage ? 'triple' : 'default'"
    divider
    :to="href"
    class="min-w-0 overflow-hidden"
  >
    <div v-if="showImage" class="flex h-full w-full min-w-0 items-stretch gap-x-3">
      <div class="flex h-full w-36 shrink-0 items-center justify-center overflow-hidden">
        <NuxtImg
          :src="tournament.league!.imageUrl!"
          :alt="tournament.league?.name ?? tournament.name"
          width="144"
          height="132"
          sizes="144px"
          class="max-h-full max-w-full object-contain"
        />
      </div>
      <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h3 class="truncate text-sm font-medium text-toned">
          {{ displayName }}
        </h3>
        <div class="flex min-w-0 flex-wrap gap-x-3 text-xs text-muted">
          <span class="truncate tabular-nums">{{ teamsLabel }}</span>
          <span class="truncate">{{ prizeLabel }}</span>
          <span class="truncate">{{ typeLabel }}</span>
        </div>
      </div>
    </div>

    <div
      v-else
      class="grid w-full min-w-0 grid-cols-10 items-center gap-x-2 text-xs font-medium text-toned"
    >
      <h3 class="col-span-5 truncate">{{ displayName }}</h3>
      <span class="col-span-2 truncate text-muted tabular-nums">{{ teamsLabel }}</span>
      <span class="col-span-2 truncate text-muted">{{ prizeLabel }}</span>
      <span class="col-span-1 truncate text-muted">{{ typeLabel }}</span>
    </div>
  </UiListItem>
</template>
