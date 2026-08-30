<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";
import { selectActiveRosterPlayers } from "@sarpbc/utils";

type TeamProfileTab = "info" | "matches" | "events" | "trophies";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const { team, teamId, pending, error } = await useTeamByRouteSlug();

if (!team.value && !error.value) {
  throw createError({ statusCode: 404, message: t("page.team.slug.teamNotFound") });
}

const {
  trophies,
  pending: trophiesPending,
  error: trophiesError,
  refresh: refreshTrophies,
} = useTeamTrophies(teamId);

const {
  live: liveEvents,
  upcoming: upcomingEvents,
  past: pastEvents,
  pending: eventsPending,
  error: eventsError,
  refresh: refreshEvents,
} = useTeamTournaments(teamId);

const {
  live: liveMatches,
  upcoming: upcomingMatches,
  past: pastMatches,
  pending: matchesPending,
  error: matchesError,
  refresh: refreshMatches,
} = useTeamMatches(teamId);

const {
  eras: rosterHistoryEras,
  pending: rosterHistoryPending,
  error: rosterHistoryError,
  refresh: refreshRosterHistory,
} = useTeamRosterHistory(teamId);

const activeRoster = computed(() => selectActiveRosterPlayers(team.value?.players ?? []));

const teamNationalities = computed(() => {
  if (!activeRoster.value.length) return [];

  return activeRoster.value
    .map((player) => player.nationality)
    .filter(
      (nationality): nationality is string => nationality != null && nationality.trim() !== "",
    );
});

const showRosterHistory = computed(
  () =>
    rosterHistoryPending.value ||
    Boolean(rosterHistoryError.value) ||
    rosterHistoryEras.value.length > 0,
);

function tabFromQuery(): TeamProfileTab {
  const value = route.query.tab;
  if (value === "matches" || value === "events" || value === "trophies") {
    return value;
  }
  return "info";
}

function replaceTabQuery(nextTab: TeamProfileTab) {
  const query: Record<string, string> = {};

  if (route.query.matches) {
    query.matches = String(route.query.matches);
  }
  if (route.query.events) {
    query.events = String(route.query.events);
  }

  if (nextTab === "info") {
    router.replace({ query: {} });
    return;
  }

  if (nextTab !== "matches") {
    delete query.matches;
  }
  if (nextTab !== "events") {
    delete query.events;
  }

  query.tab = nextTab;
  router.replace({ query });
}

const active = ref<string | number>(tabFromQuery());

watch(
  () => route.query.tab,
  () => {
    active.value = tabFromQuery();
  },
);

watch(active, (tab) => {
  const nextTab: TeamProfileTab =
    tab === "matches" || tab === "events" || tab === "trophies" ? tab : "info";
  if (nextTab === tabFromQuery()) return;
  replaceTabQuery(nextTab);
});

const tabItems = computed<TabsItem[]>(() => [
  { value: "info", label: t("page.team.slug.tabs.info") },
  { value: "matches", label: t("page.team.slug.tabs.matches") },
  { value: "events", label: t("page.team.slug.tabs.events") },
  { value: "trophies", label: t("page.team.slug.tabs.trophies") },
]);

const title = computed(() =>
  team.value?.name
    ? t("page.team.slug.seoTitleWithName", { name: team.value.name })
    : t("page.team.slug.seoTitleDefault"),
);
const description = computed(() =>
  team.value?.name
    ? t("page.team.slug.seoDescriptionWithName", { name: team.value.name })
    : t("page.team.slug.seoDescriptionDefault"),
);

setPageSeo({
  title: title.value,
  description: description.value,
  image: team.value?.imageUrl || undefined,
});
</script>

<template>
  <SHubPageBody>
    <div v-if="pending" class="w-full flex justify-center py-16">
      <div class="flex items-center gap-3 text-muted">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        {{ t("page.team.slug.loadingTeam") }}
      </div>
    </div>

    <div v-else-if="error" class="w-full flex flex-col items-center py-16 text-center">
      <h1 class="text-2xl font-bold text-error mb-4">
        {{ t("page.team.slug.errorLoadingTeam") }}
      </h1>
      <p class="text-muted">
        {{ error.message || t("page.team.slug.failedToLoadTeamData") }}
      </p>
    </div>

    <div v-else-if="team" class="w-full flex min-w-0 flex-col">
      <SCard flush-bottom class="flex w-full min-w-0 flex-col">
        <div
          class="flex h-row-double min-h-row-double w-full min-w-0 flex-row items-center gap-3 px-3"
        >
          <TeamImg
            class="shrink-0"
            :team-name="team.name"
            :image-url="team.imageUrl"
            :dark-mode-image-url="team.darkModeImageUrl"
            size="md"
            priority
          />
          <div class="flex min-w-0 flex-col items-start gap-1">
            <h1 class="text-xl font-semibold tracking-tight text-balance">
              {{ team.name }}
            </h1>
            <FlagNationalities
              v-if="teamNationalities.length > 0"
              :nationalities="teamNationalities"
              size="md"
              :fallback-to-continent="true"
            />
          </div>
        </div>
        <TeamRosterSection :players="activeRoster" />
        <UTabs
          v-model="active"
          :items="tabItems"
          :content="false"
          color="neutral"
          variant="link"
          class="w-full"
          :ui="{ list: 'border-t mb-0' }"
        />
      </SCard>

      <template v-if="active === 'info'">
        <TeamRosterTimeline
          v-if="showRosterHistory"
          :eras="rosterHistoryEras"
          :pending="rosterHistoryPending"
          :has-error="Boolean(rosterHistoryError)"
          @retry="refreshRosterHistory()"
        />
        <TeamFaqSection
          :team="team"
          :players="activeRoster"
          :upcoming-matches="upcomingMatches"
          :live-matches="liveMatches"
        />
      </template>

      <TeamMatchesSection
        v-else-if="active === 'matches'"
        :upcoming-matches="upcomingMatches"
        :past-matches="pastMatches"
        :live-matches="liveMatches"
        :pending="matchesPending"
        :has-error="Boolean(matchesError)"
        @retry="refreshMatches()"
      />

      <TeamEventsSection
        v-else-if="active === 'events'"
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />

      <TeamTrophyCabinet
        v-else
        :trophies="trophies"
        :pending="trophiesPending"
        :has-error="Boolean(trophiesError)"
        @retry="refreshTrophies()"
      />
    </div>
  </SHubPageBody>
</template>
