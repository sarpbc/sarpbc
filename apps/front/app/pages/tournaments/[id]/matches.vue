<script lang="ts" setup>
import { groupTournamentMatchesByDate } from "~/utils/groupMatchesByDate";
import { formatDayHeaderDate } from "~/utils/dateFormatter";

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(`tournament-${tournamentId.value}`, () =>
  getTournamentById(tournamentId.value),
);

const { data: matches } = await useLazyAsyncData(`tournament-matches-${tournamentId.value}`, () =>
  getTournamentMatches(tournamentId.value),
);

const groupedMatches = computed(() => groupTournamentMatchesByDate(matches.value ?? []));

const hasMatches = computed(
  () => groupedMatches.value.upcoming.length > 0 || groupedMatches.value.completed.length > 0,
);

const showUpcomingSectionTitle = computed(
  () => groupedMatches.value.upcoming.length > 0 && groupedMatches.value.completed.length > 0,
);

function formatDayHeader(group: { date: Date | null; dateKey: string }) {
  if (!group.date) {
    return t("page.tournaments.id.matchSections.unknownDate");
  }
  return formatDayHeaderDate(group.date, locale.value);
}

const title = computed(() =>
  tournament.value
    ? t(`page.tournaments.id.seoTitle`, {
        tournamentName: tournament.value.name,
      })
    : "",
);

const description = computed(() =>
  tournament.value
    ? t(`page.tournaments.id.seoDescription`, {
        tournamentName: tournament.value.name,
      })
    : "",
);

setPageSeo({
  title: title.value,
  description: description.value,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard v-if="tournament" class="w-full h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-2xl font-semibold">{{ tournament.league?.name }} {{ tournament.name }}</h1>
      </div>
    </UiCrossCard>
    <TournamentHeader :tournament-id="tournamentId" active-tab="matches" />
    <div v-if="hasMatches" class="flex flex-col gap-4">
      <section v-if="groupedMatches.upcoming.length > 0" class="flex flex-col gap-2">
        <h2 v-if="showUpcomingSectionTitle" class="text-sm font-medium text-toned pl-1">
          {{ t("page.tournaments.id.matchSections.upcoming") }}
        </h2>
        <div
          v-for="dayGroup in groupedMatches.upcoming"
          :key="`upcoming-${dayGroup.dateKey}`"
          class="flex flex-col gap-0.25"
        >
          <h3 class="flex text-sm font-medium text-toned h-10.75 items-end pl-1">
            {{ formatDayHeader(dayGroup) }}
          </h3>
          <UiCard variant="soft" class="w-full">
            <div v-for="(match, index) in dayGroup.matches" :key="match.id">
              <ULink
                :to="$localePath(`/matches/${match.id}`)"
                class="block hover:bg-elevated/50 transition-colors"
              >
                <MatchRow :match="match" :last="index === dayGroup.matches.length - 1" />
              </ULink>
            </div>
          </UiCard>
        </div>
      </section>

      <section
        v-for="dayGroup in groupedMatches.completed"
        :key="`completed-${dayGroup.dateKey}`"
        class="flex flex-col gap-0.25"
      >
        <h3 class="flex text-sm font-medium text-toned h-10.75 items-end pl-1">
          {{ formatDayHeader(dayGroup) }}
        </h3>
        <UiCard variant="soft" class="w-full">
          <div v-for="(match, index) in dayGroup.matches" :key="match.id">
            <ULink
              :to="$localePath(`/matches/${match.id}`)"
              class="block hover:bg-elevated/50 transition-colors"
            >
              <MatchResultRow :match="match" :last="index === dayGroup.matches.length - 1" />
            </ULink>
          </div>
        </UiCard>
      </section>
    </div>
    <UiCard v-else variant="soft" class="w-full">
      <div class="text-center py-8 text-muted">
        {{ t("page.tournaments.id.noMatches") }}
      </div>
    </UiCard>
  </div>
</template>
