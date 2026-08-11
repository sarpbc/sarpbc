<script lang="ts" setup>
import { groupTournamentMatchesByDate } from "~/utils/groupMatchesByDate";
import { formatDayHeaderDate } from "~/utils/dateFormatter";
import { getTournamentStatus } from "~/utils/tournamentStatus";

const route = useRoute();
const { t, locale } = useI18n();

const tournamentId = computed(() => route.params.id as string);
const SOURCE = "tournament_hub" as const;

const { data: tournament } = await useAsyncData(
  () => `tournament-${tournamentId.value}`,
  async () => {
    const result = await getTournamentById(tournamentId.value);
    if (!result) {
      throw createError({
        statusCode: 404,
        message: t("page.tournaments.id.notFound"),
      });
    }
    return result;
  },
  {
    watch: [tournamentId],
    default: () => null,
  },
);

const { data: matches } = await useAsyncData(
  () => `tournament-matches-${tournamentId.value}`,
  () => getTournamentMatches(tournamentId.value),
  {
    watch: [tournamentId],
    default: () => [],
  },
);

const groupedMatches = computed(() => groupTournamentMatchesByDate(matches.value ?? []));

const isFinished = computed(
  () => tournament.value != null && getTournamentStatus(tournament.value) === "finished",
);

const displayGroupedMatches = computed(() => {
  const { upcoming, completed } = groupedMatches.value;
  return {
    upcoming: isFinished.value ? [] : upcoming,
    completed,
  };
});

const hasMatches = computed(
  () =>
    displayGroupedMatches.value.upcoming.length > 0 ||
    displayGroupedMatches.value.completed.length > 0,
);

const showUpcomingSectionTitle = computed(
  () =>
    displayGroupedMatches.value.upcoming.length > 0 &&
    displayGroupedMatches.value.completed.length > 0,
);

function formatDayHeader(group: { date: Date | null; dateKey: string }) {
  if (!group.date) {
    return t("page.tournaments.id.matchSections.unknownDate");
  }
  return formatDayHeaderDate(group.date, locale.value);
}
</script>

<template>
  <div v-if="tournament" class="w-full flex flex-col gap-4">
    <div v-if="hasMatches" class="flex flex-col gap-4">
      <section v-if="displayGroupedMatches.upcoming.length > 0" class="flex flex-col gap-2">
        <h2 v-if="showUpcomingSectionTitle" class="text-sm font-medium text-toned pl-1">
          {{ t("page.tournaments.id.matchSections.upcoming") }}
        </h2>
        <div
          v-for="dayGroup in displayGroupedMatches.upcoming"
          :key="`upcoming-${dayGroup.dateKey}`"
          class="flex flex-col gap-px"
        >
          <h3 class="flex text-sm font-medium text-toned h-10.75 items-end pl-1">
            {{ formatDayHeader(dayGroup) }}
          </h3>
          <UiCard flush-bottom variant="soft" class="w-full">
            <div v-for="match in dayGroup.matches" :key="match.id">
              <MatchDiscoveryLink
                :match-id="match.id"
                :source="SOURCE"
                status="upcoming"
                class="block hover:bg-elevated/50 active:scale-[0.96] touch-manipulation"
              >
                <MatchRow :match="match" />
              </MatchDiscoveryLink>
            </div>
          </UiCard>
        </div>
      </section>

      <section
        v-for="dayGroup in displayGroupedMatches.completed"
        :key="`completed-${dayGroup.dateKey}`"
        class="flex flex-col gap-px"
      >
        <h3 class="flex text-sm font-medium text-toned h-10.75 items-end pl-1">
          {{ formatDayHeader(dayGroup) }}
        </h3>
        <UiCard flush-bottom variant="soft" class="w-full">
          <div v-for="match in dayGroup.matches" :key="match.id">
            <MatchDiscoveryLink
              :match-id="match.id"
              :source="SOURCE"
              status="finished"
              class="block hover:bg-elevated/50 active:scale-[0.96] touch-manipulation"
            >
              <MatchResultRow :match="match" />
            </MatchDiscoveryLink>
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
