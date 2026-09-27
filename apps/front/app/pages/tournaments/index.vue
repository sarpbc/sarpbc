<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { buildTournamentItemList } from "~/utils/structuredData/tournamentItemList";

const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

const TOURNAMENTS_PER_PAGE = 20;

interface TournamentsIndexPayload {
  tournaments: Tournament[];
  total: number;
}

const offset = computed(() => {
  const param = route.query.offset as string;
  return param ? parseInt(param, 10) : 0;
});

const {
  data: tournamentsResponse,
  pending,
  error,
  refresh,
} = await useAsyncData<TournamentsIndexPayload>(
  () => `tournaments-index-${offset.value}`,
  async () => {
    const result = await getAllTournaments({
      limit: TOURNAMENTS_PER_PAGE,
      offset: offset.value,
    });
    return result;
  },
  {
    default: () => ({ tournaments: [], total: 0 }),
    watch: [offset],
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  },
);

const tournaments = computed(() => tournamentsResponse.value?.tournaments ?? []);
const totalTournaments = computed(() => tournamentsResponse.value?.total ?? 0);

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

const tournamentsJsonLd = computed(() => {
  if (pending.value && tournaments.value.length === 0) {
    return null;
  }

  return buildTournamentItemList({
    tournaments: tournaments.value,
    total: totalTournaments.value,
    positionOffset: offset.value,
  });
});

setJsonLd("ld-json-tournaments-index", tournamentsJsonLd);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.tournaments.index.title") }}</template>
    </SHubPageHeader>

    <div v-if="pending && !tournaments.length" class="w-full flex flex-col" aria-live="polite">
      <SCard flush-bottom flush-top>
        <SListItem v-for="i in 6" :key="i" size="default" divider :divider-top="i === 1">
          <div class="grid w-full grid-cols-10 items-center gap-x-2">
            <USkeleton class="col-span-5 h-3 max-w-48" />
            <USkeleton class="col-span-2 h-3 max-w-16" />
            <USkeleton class="col-span-2 h-3 max-w-16" />
            <USkeleton class="col-span-1 h-3 max-w-10" />
          </div>
        </SListItem>
      </SCard>
    </div>

    <SCard v-else-if="tournaments.length" flush-bottom flush-top>
      <TournamentRow
        v-for="(tournament, index) in tournaments"
        :key="tournament.id"
        :tournament="tournament"
        :divider-top="index === 0"
      />
    </SCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.index.error')" @retry="refresh()" />
    </SCard>

    <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState icon="i-fluent-trophy-24-regular" :title="t('page.tournaments.index.empty')" />
    </SCard>

    <SPagination
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :has-previous="hasPrevious"
      :has-next="hasNext"
      :previous-to="{ path: $localePath('/tournaments'), query: previousPageQuery }"
      :next-to="{ path: $localePath('/tournaments'), query: nextPageQuery }"
    />
  </div>
</template>
