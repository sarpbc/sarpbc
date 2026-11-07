<script lang="ts" setup>
import { selectActiveRosterPlayers, selectTeamStaff, teamPath } from "@sarpbc/utils";

const route = useRoute();
const localePath = useLocalePath();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const { slug, team, teamId, pending, error, refresh } = await useTeamByRouteSlug();

if (!team.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.team.slug.teamNotFound"),
    failed: t("page.team.slug.failedToLoadTeamData"),
  });
}

// A merged duplicate's slug resolves to the kept team.
if (team.value && team.value.slug !== slug.value) {
  await redirectToCanonical(route, localePath(teamPath(team.value.slug)));
}

const {
  trophies,
  pending: trophiesPending,
  error: trophiesError,
  refresh: refreshTrophies,
} = useEntityTrophies("team", teamId);

const {
  live: liveEvents,
  upcoming: upcomingEvents,
  past: pastEvents,
  pending: eventsPending,
  error: eventsError,
  refresh: refreshEvents,
} = useEntityTournaments("team", teamId);

const {
  live: liveMatches,
  upcoming: upcomingMatches,
  past: pastMatches,
  pending: matchesPending,
  error: matchesError,
  refresh: refreshMatches,
} = useEntityMatches("team", teamId);

const {
  eras: rosterHistoryEras,
  pending: rosterHistoryPending,
  error: rosterHistoryError,
  refresh: refreshRosterHistory,
} = useTeamRosterHistory(teamId);

const activeRoster = computed(() => selectActiveRosterPlayers(team.value?.players ?? []));
const staff = computed(() => selectTeamStaff(team.value?.players ?? []));

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

const { tab, tabItems, setTab } = useEntityTabs("team");

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
  image: team.value?.logoLightUrl || team.value?.imageUrl || undefined,
});
</script>

<template>
  <SHubPageBody>
    <div v-if="pending" class="w-full flex min-w-0 flex-col" aria-live="polite">
      <span class="sr-only">{{ t("page.team.slug.loadingTeam") }}</span>
      <SCard class="flex w-full min-w-0 flex-col">
        <div class="flex min-h-row-stack w-full items-center gap-4 p-4 animate-pulse">
          <div class="size-16 shrink-0 bg-elevated" />
          <div class="flex flex-col gap-2">
            <div class="h-6 w-48 bg-elevated" />
            <div class="h-4 w-24 bg-elevated" />
          </div>
        </div>
        <div class="h-row border-t border-default" />
      </SCard>
    </div>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.team.slug.failedToLoadTeamData')" @retry="refresh()" />
    </SCard>

    <div v-else-if="team" class="w-full flex min-w-0 flex-col">
      <SCard class="flex w-full min-w-0 flex-col">
        <!-- Snapped with its top border so the tab bar below lands on the rail row grid. -->
        <div class="flex h-row-grid w-full min-w-0 flex-col border-t border-default">
          <div
            class="flex h-row-double min-h-row-double w-full min-w-0 flex-row items-center gap-3 px-3"
          >
            <TeamImg class="shrink-0" :team-name="team.name" :logo="team" size="md" priority />
            <div class="flex min-w-0 flex-col items-start gap-1">
              <h1 class="text-xl font-medium tracking-tight text-balance">
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
          <TeamRosterSection :players="activeRoster" class="flex-1" />
        </div>
        <UTabs
          :model-value="tab"
          :items="tabItems"
          :content="false"
          color="neutral"
          variant="link"
          class="w-full"
          :ui="{ list: 'h-row items-center border-t py-0 mb-0' }"
          @update:model-value="setTab"
        />
      </SCard>

      <template v-if="tab === 'info'">
        <TeamStaffSection v-if="staff.length > 0" :staff="staff" />
        <TeamRosterTimeline
          v-if="showRosterHistory"
          :eras="rosterHistoryEras"
          :pending="rosterHistoryPending"
          :has-error="Boolean(rosterHistoryError)"
          @retry="refreshRosterHistory()"
        />
        <TransferLatest :team="team.slug" />
        <TeamFaqSection
          :team="team"
          :players="activeRoster"
          :upcoming-matches="upcomingMatches"
          :live-matches="liveMatches"
        />
      </template>

      <EntityMatchesSection
        kind="team"
        v-else-if="tab === 'matches'"
        :upcoming-matches="upcomingMatches"
        :past-matches="pastMatches"
        :live-matches="liveMatches"
        :pending="matchesPending"
        :has-error="Boolean(matchesError)"
        @retry="refreshMatches()"
      />

      <EntityEventsSection
        kind="team"
        v-else-if="tab === 'events'"
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />

      <EarningsSection v-else-if="tab === 'earnings'" owner="team" :owner-id="team.id" />

      <EntityTrophyCabinet
        kind="team"
        v-else
        :trophies="trophies"
        :pending="trophiesPending"
        :has-error="Boolean(trophiesError)"
        @retry="refreshTrophies()"
      />
    </div>
  </SHubPageBody>
</template>
