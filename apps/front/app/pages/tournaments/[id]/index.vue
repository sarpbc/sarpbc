<script lang="ts" setup>
import { usePreferredReducedMotion } from "@vueuse/core";
import { motion } from "motion-v";
import type { UpcomingMatchesResponse } from "~/types/matches";
import { isPickemTournamentActive } from "~/utils/pickems";

const MATCH_HIGHLIGHTS_LIMIT = 5;

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const reducedMotionPreference = usePreferredReducedMotion();
const prefersReducedMotion = computed(() => reducedMotionPreference.value === "reduce");

function sectionMotion(delayIndex: number) {
  if (prefersReducedMotion.value) {
    return {
      initial: false as const,
      animate: undefined,
      transition: undefined,
    };
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      type: "spring" as const,
      duration: 0.35,
      bounce: 0,
      delay: delayIndex * 0.1,
    },
  };
}

const tournamentId = computed(() => route.params.id as string);

const tournamentRequest = useAsyncData(
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

const matchHighlightsRequest = useAsyncData<UpcomingMatchesResponse>(
  () => `tournament-match-highlights-${tournamentId.value}`,
  () =>
    getUpcomingMatches({
      tournamentId: tournamentId.value,
      limit: MATCH_HIGHLIGHTS_LIMIT,
    }),
  {
    watch: [tournamentId],
    default: () => ({
      live: [],
      upcoming: [],
      liveTotal: 0,
      upcomingTotal: 0,
      total: 0,
    }),
  },
);

const [tournamentState, matchHighlightsState] = await Promise.all([
  tournamentRequest,
  matchHighlightsRequest,
]);

const { data: tournament, pending, error, refresh } = tournamentState;
const {
  data: matchHighlights,
  pending: matchHighlightsPending,
  error: matchHighlightsError,
  refresh: refreshMatchHighlights,
} = matchHighlightsState;

const title = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoTitle", {
        tournamentName: tournament.value.name,
      })
    : t("page.tournaments.id.seoTitleDefault"),
);

const description = computed(() =>
  tournament.value
    ? t("page.tournaments.id.seoDescription", {
        tournamentName: tournament.value.name,
      })
    : t("page.tournaments.id.seoDescriptionDefault"),
);

const showPickemCta = computed(
  () => tournament.value != null && isPickemTournamentActive(tournament.value),
);

const tournamentMatches = computed(() => tournament.value?.matches ?? []);

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
        <p class="text-sm text-muted text-pretty">
          {{ t("page.tournaments.id.error") }}
        </p>
        <UButton variant="outline" @click="refresh()">
          {{ t("page.tournaments.id.retry") }}
        </UButton>
      </div>
    </UiCard>

    <template v-else-if="tournament">
      <motion.div v-bind="sectionMotion(0)">
        <TournamentHero :tournament="tournament" />
      </motion.div>
      <motion.div v-bind="sectionMotion(1)">
        <TournamentHeader :tournament-id="tournamentId" active-tab="overview" />
      </motion.div>
      <motion.div v-if="showPickemCta" v-bind="sectionMotion(2)">
        <PickemPromoBanner :tournament="tournament" variant="homepage" />
      </motion.div>
      <motion.div v-bind="sectionMotion(showPickemCta ? 3 : 2)">
        <TournamentMatchHighlights
          :tournament-id="tournamentId"
          :live-matches="matchHighlights.live"
          :upcoming-matches="matchHighlights.upcoming"
          :pending="matchHighlightsPending"
          :has-error="Boolean(matchHighlightsError)"
          @retry="refreshMatchHighlights()"
        />
      </motion.div>
      <motion.div v-bind="sectionMotion(showPickemCta ? 4 : 3)">
        <TournamentLatestResults
          :tournament-id="tournamentId"
          :matches="tournamentMatches"
          :pending="pending"
        />
      </motion.div>
      <motion.div v-bind="sectionMotion(showPickemCta ? 5 : 4)">
        <TournamentParticipants :tournament="tournament" />
      </motion.div>
      <motion.div v-bind="sectionMotion(showPickemCta ? 6 : 5)">
        <section class="w-full flex flex-col gap-3" aria-labelledby="tournament-bracket-title">
          <h2
            id="tournament-bracket-title"
            class="text-xl font-semibold tracking-tight text-balance"
          >
            {{ $t("page.tournaments.id.bracketTitle") }}
          </h2>
          <UCard variant="soft" class="w-full" :ui="{ body: 'p-2 overflow-x-auto' }">
            <TournamentBracket :tournament="tournament" />
          </UCard>
        </section>
      </motion.div>
    </template>
  </div>
</template>
