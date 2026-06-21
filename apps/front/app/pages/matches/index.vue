<script lang="ts" setup>
import type { Match, MatchesPageData } from "~/types/matches";

const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const MATCHES_PER_PAGE = 20;

type MatchesTab = "upcoming" | "past";

const tab = computed<MatchesTab>(() => {
  const value = route.query.tab as string;
  return value === "past" ? "past" : "upcoming";
});

const offset = computed(() => {
  const param = route.query.offset as string;
  const parsed = param ? parseInt(param, 10) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
});

const {
  data: matchesData,
  pending,
  error,
  refresh,
} = await useLazyAsyncData<MatchesPageData | null>(
  () => `matches-${tab.value}-${offset.value}`,
  (): Promise<MatchesPageData> => {
    const query = { limit: MATCHES_PER_PAGE, offset: offset.value };
    return tab.value === "past" ? getMatchesResults(query) : getUpcomingMatches(query);
  },
  {
    watch: [tab, offset],
    default: () => null,
  },
);

const liveMatches = computed(() =>
  tab.value === "upcoming" && matchesData.value && "live" in matchesData.value
    ? matchesData.value.live
    : [],
);

const upcomingMatches = computed(() =>
  tab.value === "upcoming" && matchesData.value && "upcoming" in matchesData.value
    ? matchesData.value.upcoming
    : [],
);

const pastMatches = computed(() =>
  tab.value === "past" && matchesData.value && "results" in matchesData.value
    ? matchesData.value.results
    : [],
);

const totalMatches = computed(() => {
  if (!matchesData.value) return 0;
  if ("total" in matchesData.value && tab.value === "upcoming") {
    return matchesData.value.total;
  }
  if ("total" in matchesData.value && tab.value === "past") {
    return matchesData.value.total;
  }
  return 0;
});

const hasMatches = computed(() => {
  if (tab.value === "past") {
    return pastMatches.value.length > 0;
  }
  return liveMatches.value.length > 0 || upcomingMatches.value.length > 0;
});

const currentPage = computed(() => Math.floor(offset.value / MATCHES_PER_PAGE) + 1);
const totalPages = computed(() => Math.max(1, Math.ceil(totalMatches.value / MATCHES_PER_PAGE)));

const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + MATCHES_PER_PAGE < totalMatches.value);

const tabItems = computed(() => [
  { value: "upcoming" as const, label: t("page.matches.tabs.upcoming") },
  { value: "past" as const, label: t("page.matches.tabs.past") },
]);

function getTabQuery(nextTab: MatchesTab) {
  return {
    tab: nextTab,
    offset: "0",
  };
}

function getPageQuery(nextOffset: number) {
  return {
    tab: tab.value,
    offset: String(Math.max(0, nextOffset)),
  };
}

function tournamentLabel(match: Match) {
  const league = match.tournament?.league?.name;
  const name = match.tournament?.name;
  if (league && name) return `${league} ${name}`;
  return name ?? t("page.matches.unknownTournament");
}

function tournamentMatchesPath(tournamentId: string) {
  return `/tournaments/${tournamentId}/matches`;
}

setPageSeo({
  title: t("page.matches.seo.title"),
  description: t("page.matches.seo.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ t("page.matches.title") }}
        </h1>
      </div>
    </UiCrossCard>

    <UiCard>
      <div class="flex flex-wrap gap-1 p-1.5">
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          variant="soft"
          :color="tab === item.value ? 'primary' : 'neutral'"
          :to="{ path: $localePath('/matches'), query: getTabQuery(item.value) }"
          class="min-h-9 px-3"
        >
          {{ item.label }}
        </UButton>
      </div>
    </UiCard>

    <div v-if="pending" class="w-full flex flex-col gap-2" aria-live="polite">
      <UiCard v-for="index in 4" :key="index" class="p-4">
        <div class="flex flex-col gap-3 animate-pulse">
          <div class="h-3 w-40 rounded bg-elevated" />
          <div class="h-8 w-full rounded bg-elevated" />
        </div>
      </UiCard>
    </div>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted">
          {{ t("page.matches.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ t("page.matches.retry") }}
        </UButton>
      </div>
    </UiCard>

    <template v-else-if="hasMatches">
      <template v-if="tab === 'upcoming'">
        <section v-if="liveMatches.length > 0" class="w-full flex flex-col gap-2">
          <h2 class="text-sm font-medium text-toned pl-1">
            {{ t("page.matches.sections.live") }}
          </h2>
          <UiCard variant="soft">
            <div class="flex flex-col">
              <div
                v-for="(match, index) in liveMatches"
                :key="match.id"
                class="border-b border-default last:border-b-0"
              >
                <div class="px-2 pt-2 pb-1">
                  <ULink
                    :to="$localePath(tournamentMatchesPath(match.tournament.id))"
                    class="text-xs text-muted hover:text-highlighted"
                  >
                    {{ tournamentLabel(match) }}
                  </ULink>
                </div>
                <MatchRow :match="match" :live="true" :last="index === liveMatches.length - 1" />
              </div>
            </div>
          </UiCard>
        </section>

        <section v-if="upcomingMatches.length > 0" class="w-full flex flex-col gap-2">
          <h2 class="text-sm font-medium text-toned pl-1">
            {{ t("page.matches.sections.upcoming") }}
          </h2>
          <UiCard variant="soft">
            <div class="flex flex-col">
              <div
                v-for="(match, index) in upcomingMatches"
                :key="match.id"
                class="border-b border-default last:border-b-0"
              >
                <div class="px-2 pt-2 pb-1">
                  <ULink
                    :to="$localePath(tournamentMatchesPath(match.tournament.id))"
                    class="text-xs text-muted hover:text-highlighted"
                  >
                    {{ tournamentLabel(match) }}
                  </ULink>
                </div>
                <MatchRow :match="match" :last="index === upcomingMatches.length - 1" />
              </div>
            </div>
          </UiCard>
        </section>
      </template>

      <section v-else class="w-full flex flex-col gap-2">
        <UiCard variant="soft">
          <div class="flex flex-col">
            <div
              v-for="(match, index) in pastMatches"
              :key="match.id"
              class="border-b border-default last:border-b-0"
            >
              <div class="px-2 pt-2 pb-1">
                <ULink
                  :to="$localePath(tournamentMatchesPath(match.tournament.id))"
                  class="text-xs text-muted hover:text-highlighted"
                >
                  {{ tournamentLabel(match) }}
                </ULink>
              </div>
              <MatchResultRow :match="match" :last="index === pastMatches.length - 1" />
            </div>
          </div>
        </UiCard>
      </section>

      <UiCard v-if="totalMatches > MATCHES_PER_PAGE">
        <div class="flex justify-between items-center p-2 gap-2">
          <UButton
            :disabled="!hasPrevious"
            variant="outline"
            :to="{ path: $localePath('/matches'), query: getPageQuery(offset - MATCHES_PER_PAGE) }"
            as="link"
          >
            <UIcon name="i-fluent-chevron-left-24-regular" />
            {{ t("common.previous") }}
          </UButton>

          <div class="text-sm text-muted tabular-nums">
            {{ t("page.matches.pagination.page") }} {{ currentPage }} / {{ totalPages }}
          </div>

          <UButton
            :disabled="!hasNext"
            variant="outline"
            :to="{ path: $localePath('/matches'), query: getPageQuery(offset + MATCHES_PER_PAGE) }"
            as="link"
          >
            {{ t("common.next") }}
            <UIcon name="i-fluent-chevron-right-24-regular" />
          </UButton>
        </div>
      </UiCard>
    </template>

    <UiCard v-else>
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon
          :name="
            tab === 'upcoming' ? 'i-fluent-calendar-clock-24-regular' : 'i-fluent-trophy-24-regular'
          "
          class="text-4xl text-muted"
        />
        <p class="text-sm text-muted">
          {{ tab === "upcoming" ? t("page.matches.empty.upcoming") : t("page.matches.empty.past") }}
        </p>
        <p class="text-xs text-dimmed">
          {{
            tab === "upcoming"
              ? t("page.matches.empty.upcomingHint")
              : t("page.matches.empty.pastHint")
          }}
        </p>
        <UButton
          variant="soft"
          color="primary"
          :to="{
            path: $localePath('/matches'),
            query: getTabQuery(tab === 'upcoming' ? 'past' : 'upcoming'),
          }"
        >
          {{
            tab === "upcoming"
              ? t("page.matches.empty.viewPast")
              : t("page.matches.empty.viewUpcoming")
          }}
        </UButton>
      </div>
    </UiCard>
  </div>
</template>
