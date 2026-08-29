<script lang="ts" setup>
import { selectActiveRosterPlayers } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const slug = computed(() => route.params.slug as string);

const {
  data: team,
  pending,
  error,
} = await useAsyncData(
  () => `team-${slug.value}`,
  () => getTeamFromSlug(slug.value),
  { watch: [slug] },
);

if (!team.value && !error.value) {
  throw createError({ statusCode: 404, message: t("page.team.slug.teamNotFound") });
}

const teamId = computed(() => team.value?.id);

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
  <div class="w-full max-w-5xl flex flex-col items-center px-8 lg:px-0 gap-4 lg:gap-8">
    <div v-if="pending" class="w-full flex justify-center py-16">
      <div class="flex items-center gap-3 text-muted">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        {{ $t("page.team.slug.loadingTeam") }}
      </div>
    </div>

    <div v-else-if="error" class="w-full flex flex-col items-center py-16 text-center">
      <h1 class="text-2xl font-bold text-error mb-4">
        {{ $t("page.team.slug.errorLoadingTeam") }}
      </h1>
      <p class="text-muted">
        {{ error.message || $t("page.team.slug.failedToLoadTeamData") }}
      </p>
    </div>

    <section v-else-if="team" class="w-full flex flex-col gap-6">
      <div class="w-full flex flex-col">
        <div class="w-full flex flex-row items-center gap-2 md:h-18 justify-start">
          <TeamImg
            :team-name="team.name"
            :image-url="team.imageUrl"
            :dark-mode-image-url="team.darkModeImageUrl"
            size="md"
            priority
          />
          <div class="h-full flex flex-col">
            <h1 class="flex text-xl font-semibold">{{ team.name }}</h1>
            <div v-if="teamNationalities.length > 0" class="flex items-center gap-2 mt-1">
              <FlagNationalities
                :nationalities="teamNationalities"
                size="lg"
                :fallback-to-continent="true"
              />
            </div>
          </div>
        </div>

        <div
          v-if="activeRoster.length"
          class="flex flex-row flex-wrap justify-center items-center gap-4 border border-default p-4"
        >
          <PlayerProfile
            v-for="player in activeRoster"
            :key="player.id"
            :player="player"
            size="lg"
          />
        </div>
      </div>

      <TeamTrophyCabinet
        :trophies="trophies"
        :pending="trophiesPending"
        :has-error="Boolean(trophiesError)"
        @retry="refreshTrophies()"
      />

      <TeamEventsSection
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />

      <TeamMatchesSection
        :upcoming-matches="upcomingMatches"
        :past-matches="pastMatches"
        :live-matches="liveMatches"
        :pending="matchesPending"
        :has-error="Boolean(matchesError)"
        @retry="refreshMatches()"
      />

      <TeamRosterTimeline
        :eras="rosterHistoryEras"
        :pending="rosterHistoryPending"
        :has-error="Boolean(rosterHistoryError)"
        @retry="refreshRosterHistory()"
      />
    </section>
  </div>
</template>
