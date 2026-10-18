<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { buildTournamentItemList } from "~/utils/structuredData/tournamentItemList";
import { tournamentEventDisplayName } from "~/utils/tournamentEventDisplayName";
import { getTournamentStatus } from "~/utils/tournamentStatus";

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

const { data: nextEvent } = useLazyAsyncData(
  "tournaments-next-event",
  async () => {
    const { tournaments: active } = await getAllTournaments({ limit: 50, activeOnly: true });
    const next = active
      .filter((tournament) => getTournamentStatus(tournament) === "upcoming")
      .toSorted((a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime())[0];
    if (!next) return null;
    return {
      id: next.id,
      name: tournamentEventDisplayName({
        name: next.name,
        leagueName: next.league?.name,
        serie: next.serie,
      }),
    };
  },
  { default: () => null },
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
  title: t("page.tournaments.index.seoTitle"),
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
      <template v-if="nextEvent" #meta>
        <SLink :to="$localePath(`/tournaments/${nextEvent.id}`)" variant="muted">
          {{ t("page.hub.headers.nextEvent", { name: nextEvent.name }) }}
        </SLink>
      </template>
    </SHubPageHeader>

    <div>
      <div v-if="pending && !tournaments.length" class="w-full flex flex-col" aria-live="polite">
        <SRail v-for="group in 2" :key="group" caption="section">
          <template #caption>
            <USkeleton class="h-3 w-40" />
          </template>
          <SCard flush-bottom flush-top>
            <SListItem v-for="row in 3" :key="row" divider class="gap-3">
              <USkeleton class="h-3 max-w-32 flex-1" />
              <USkeleton class="h-3 w-24 sm:w-32" />
              <USkeleton class="h-3 w-20" />
            </SListItem>
          </SCard>
        </SRail>
      </div>

      <template v-else-if="tournaments.length">
        <TournamentListGroup :tournaments="tournaments" />

        <SPagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :has-previous="hasPrevious"
          :has-next="hasNext"
          :previous-to="{ path: $localePath('/tournaments'), query: previousPageQuery }"
          :next-to="{ path: $localePath('/tournaments'), query: nextPageQuery }"
          class="mt-row"
        />
      </template>

      <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.tournaments.index.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState icon="i-fluent-trophy-24-regular" :title="t('page.tournaments.index.empty')" />
      </SCard>
    </div>
  </div>
</template>
