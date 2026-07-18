<script lang="ts" setup>
import { groupTournamentMatchesByDate } from "~/utils/groupMatchesByDate";
import { formatDayHeaderDate } from "~/utils/dateFormatter";

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const tournamentId = computed(() => route.params.id as string);

const {
  data: tournament,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
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

const { data: matches } = await useLazyAsyncData(
  () => `tournament-matches-${tournamentId.value}`,
  () => getTournamentMatches(tournamentId.value),
  {
    watch: [tournamentId],
    default: () => [],
  },
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
    ? t("page.tournaments.id.seoTitle", {
        tournamentName: tournament.value.name,
      })
    : "",
);

const description = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoDescription", {
        tournamentName: tournament.value.name,
      })
    : "",
);

watch(
  [title, description],
  () => {
    setPageSeo({
      title: title.value,
      description: description.value,
    });
  },
  { immediate: true },
);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div v-if="pending" class="w-full flex flex-col gap-4" aria-live="polite">
      <UiCrossCard class="h-24">
        <div class="w-full p-4 animate-pulse flex flex-col gap-3 items-center">
          <div class="h-3 w-32 rounded bg-elevated" />
          <div class="h-8 w-full max-w-md rounded bg-elevated" />
          <div class="h-3 w-48 rounded bg-elevated" />
        </div>
      </UiCrossCard>
    </div>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
        <p class="text-sm text-muted">
          {{ t("page.tournaments.id.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ t("page.tournaments.id.retry") }}
        </UButton>
      </div>
    </UiCard>

    <template v-else-if="tournament">
      <TournamentHero :tournament="tournament" />
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
    </template>
  </div>
</template>
