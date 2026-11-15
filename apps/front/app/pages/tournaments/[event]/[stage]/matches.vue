<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { formatDayHeaderDate } from "~/utils/date-formatter";
import { getTournamentStatus } from "~/utils/tournament-status";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const { t, locale } = useI18n();

const tournamentId = computed(() => tournament.id);
const SOURCE = "tournament_hub" as const;

const {
  data: matches,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-matches-${tournamentId.value}`,
  () => getTournamentMatches(tournamentId.value),
  {
    default: () => [],
    watch: [tournamentId],
  },
);

const groupedMatches = computed(() => {
  const all = matches.value ?? [];

  return {
    completed: groupByDay(
      all.filter((match) => match.endAt),
      (match) => match.endAt,
      "desc",
    ),
    upcoming: groupByDay(
      all.filter((match) => !match.endAt),
      (match) => match.beginAt,
      "asc",
    ),
  };
});

const isFinished = computed(() => getTournamentStatus(tournament) === "finished");

const displayGroupedMatches = computed(() => {
  const { upcoming, completed } = groupedMatches.value;

  return {
    completed,
    upcoming: isFinished.value ? [] : upcoming,
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

const formatDayHeader = (group: { date: Date | null; dateKey: string }) => {
  if (!group.date) {
    return t("page.tournaments.id.matchSections.unknownDate");
  }

  return formatDayHeaderDate(group.date, locale.value);
};
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubCard v-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.id.matchesError')" @retry="refresh()" />
    </HubCard>
    <div v-else-if="hasMatches" class="flex flex-col gap-4">
      <section v-if="displayGroupedMatches.upcoming.length > 0" class="flex flex-col">
        <h2
          v-if="showUpcomingSectionTitle"
          class="flex h-row min-h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted"
        >
          {{ t("page.tournaments.id.matchSections.upcoming") }}
        </h2>
        <div
          v-for="dayGroup in displayGroupedMatches.upcoming"
          :key="`upcoming-${dayGroup.dateKey}`"
          class="flex flex-col"
        >
          <h3 class="flex h-row min-h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted">
            {{ formatDayHeader(dayGroup) }}
          </h3>
          <HubCard class="w-full">
            <MatchLinkRows
              :matches="dayGroup.items"
              variant="upcoming"
              :source="SOURCE"
              :show-date="false"
            />
          </HubCard>
        </div>
      </section>

      <section
        v-for="dayGroup in displayGroupedMatches.completed"
        :key="`completed-${dayGroup.dateKey}`"
        class="flex flex-col"
      >
        <h3 class="flex h-row min-h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted">
          {{ formatDayHeader(dayGroup) }}
        </h3>
        <HubCard class="w-full">
          <MatchLinkRows :matches="dayGroup.items" variant="result" :source="SOURCE" />
        </HubCard>
      </section>
    </div>
    <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState
        icon="i-fluent-calendar-clock-24-regular"
        :title="t('page.tournaments.id.noMatches')"
      />
    </HubCard>
  </div>
</template>
