<script lang="ts" setup>
import type { TournamentListItem } from "@sarpbc/types";
import { tournamentEventPath } from "@sarpbc/utils";
import type { TournamentEvent } from "~/types/tournament";
import { buildTournamentItemList } from "~/utils/structuredData/tournamentItemList";
import { getTournamentStatus } from "~/utils/tournamentStatus";

const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

const EVENTS_PER_PAGE = 20;

interface TournamentsIndexPayload {
  events: TournamentEvent<TournamentListItem>[];
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
  () => getEvents({ limit: EVENTS_PER_PAGE, offset: offset.value }),
  {
    default: () => ({ events: [], total: 0 }),
    watch: [offset],
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  },
);

const { data: nextEvent } = useLazyAsyncData(
  "tournaments-next-event",
  async () => {
    const { events: active } = await getEvents({ limit: 50, activeOnly: true });
    const next = active
      .filter((event) => getTournamentStatus(event) === "upcoming")
      .toSorted((a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime())[0];
    if (!next) return null;
    return { slug: next.slug, name: next.name };
  },
  { default: () => null },
);

const events = computed(() => tournamentsResponse.value?.events ?? []);
const totalEvents = computed(() => tournamentsResponse.value?.total ?? 0);

const currentPage = computed(() => Math.floor(offset.value / EVENTS_PER_PAGE) + 1);
const totalPages = computed(() => Math.max(1, Math.ceil(totalEvents.value / EVENTS_PER_PAGE)));

const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + EVENTS_PER_PAGE < totalEvents.value);

const previousPageQuery = computed(() => ({
  offset: Math.max(0, offset.value - EVENTS_PER_PAGE).toString(),
}));

const nextPageQuery = computed(() => ({
  offset: (offset.value + EVENTS_PER_PAGE).toString(),
}));

setPageSeo({
  title: t("page.tournaments.index.seoTitle"),
  description: t("page.tournaments.index.description", { count: totalEvents.value }),
});

const tournamentsJsonLd = computed(() => {
  if (pending.value && events.value.length === 0) {
    return null;
  }

  return buildTournamentItemList({
    events: events.value,
    total: totalEvents.value,
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
        <SLink :to="$localePath(tournamentEventPath(nextEvent.slug))" variant="muted">
          {{ t("page.hub.headers.nextEvent", { name: nextEvent.name }) }}
        </SLink>
      </template>
    </SHubPageHeader>

    <div>
      <div v-if="pending && !events.length" class="w-full flex flex-col" aria-live="polite">
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

      <template v-else-if="events.length">
        <TournamentListGroup :events="events" />

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
