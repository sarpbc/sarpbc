<script lang="ts" setup>
const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const TOURNAMENTS_PER_PAGE = 20;

const offset = computed(() => {
  const param = route.query.offset as string;
  return param ? parseInt(param, 10) : 0;
});

const { data: tournamentsResponse, pending } = await useLazyAsyncData(
  () => `tournaments-index-${offset.value}`,
  () =>
    getAllTournaments({
      limit: TOURNAMENTS_PER_PAGE,
      offset: offset.value,
    }),
  {
    default: () => ({ tournaments: [], total: 0 }),
    watch: [offset],
  },
);

const tournaments = computed(() => tournamentsResponse.value?.tournaments ?? []);
const totalTournaments = computed(() => tournamentsResponse.value?.total ?? 0);

const nextTournament = computed(() => {
  const now = Date.now();
  return tournaments.value
    .filter((tournament) => {
      if (!tournament.beginAt) {
        return false;
      }
      return new Date(tournament.beginAt).getTime() > now;
    })
    .sort((a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime())[0];
});

const currentPage = computed(() => Math.floor(offset.value / TOURNAMENTS_PER_PAGE) + 1);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalTournaments.value / TOURNAMENTS_PER_PAGE)),
);

const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + TOURNAMENTS_PER_PAGE < totalTournaments.value);

const previousPageQuery = computed(() => ({
  offset: Math.max(0, offset.value - TOURNAMENTS_PER_PAGE).toString(),
}));

const nextPageQuery = computed(() => ({
  offset: (offset.value + TOURNAMENTS_PER_PAGE).toString(),
}));

setPageSeo({
  title: `${t("page.tournaments.index.title")} | sarpbc.org`,
  description: t("page.tournaments.index.description", { count: totalTournaments.value }),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiHubPageHeader>
      <template #title>{{ t("page.tournaments.index.title") }}</template>
      <template v-if="nextTournament" #meta>
        <span>
          {{
            t("page.hub.headers.tournamentsNext", {
              name: `${nextTournament.league?.name ?? ""} ${nextTournament.name}`.trim(),
            })
          }}
        </span>
      </template>
      <template v-else-if="totalTournaments" #meta>
        <span>{{ t("page.hub.headers.tournamentsTotal", { count: totalTournaments }) }}</span>
      </template>
    </UiHubPageHeader>

    <div
      v-if="pending && !tournaments.length"
      class="w-full flex flex-col gap-0"
      aria-live="polite"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-16 border-b border-default animate-pulse bg-elevated/40"
      />
    </div>

    <div v-else-if="tournaments.length" class="w-full flex flex-col gap-0">
      <TournamentRow
        v-for="tournament in tournaments"
        :key="tournament.id"
        :tournament="tournament"
      />
    </div>

    <UiCard v-else class="p-6">
      <p class="text-sm text-muted">{{ t("page.tournaments.index.empty") }}</p>
    </UiCard>

    <div v-if="totalPages > 1" class="flex flex-row items-center justify-between gap-4 pt-2">
      <UButton
        :disabled="!hasPrevious"
        variant="outline"
        :to="{ path: $localePath('/tournaments'), query: previousPageQuery }"
        as="link"
      >
        <UIcon name="i-fluent-chevron-left-24-regular" />
        {{ t("common.previous") }}
      </UButton>

      <div class="text-sm text-muted">
        {{ t("page.tournaments.index.page") }} {{ currentPage }} /
        {{ totalPages }}
      </div>

      <UButton
        :disabled="!hasNext"
        variant="outline"
        :to="{ path: $localePath('/tournaments'), query: nextPageQuery }"
        as="link"
      >
        {{ t("common.next") }}
        <UIcon name="i-fluent-chevron-right-24-regular" />
      </UButton>
    </div>
  </div>
</template>
