<script lang="ts" setup>
import CareerEnd from "~/components/career/CareerEnd.vue";
import CareerEventCard from "~/components/career/EventCard.vue";
import CareerMatchResults from "~/components/career/MatchResults.vue";
import CareerOffseasonOffer from "~/components/career/OffseasonOffer.vue";
import CareerOnboarding from "~/components/career/Onboarding.vue";
import CareerStatsBar from "~/components/career/StatsBar.vue";
import { encodeCareerResultForShare } from "~/composables/useCareerStorage";
import { useCareerSimulator } from "~/composables/useCareerSimulator";
import type { CareerPhase } from "~/types/career";
import { EVENTS_PER_SEASON, TOTAL_SEASONS } from "~/types/career";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();

const {
  state,
  hydrated,
  pendingMatches,
  pendingPlacement,
  currentEvent,
  hydrate,
  resetCareer,
  setOnboardingStep,
  setPlayerName,
  setRegion,
  setRole,
  setBackground,
  completeOnboarding,
  startSeason,
  resolveEventChoice,
  finishMatchPhase,
  acceptOffer,
  stayWithTeam,
} = useCareerSimulator();

function assertNever(value: never): never {
  throw new Error(`Unexpected phase: ${String(value)}`);
}

function renderPhase(phase: CareerPhase): string {
  switch (phase) {
    case "onboarding":
      return "onboarding";
    case "season_intro":
      return "season_intro";
    case "event":
      return "event";
    case "match":
      return "match";
    case "offseason":
      return "offseason";
    case "career_end":
      return "career_end";
    default:
      return assertNever(phase);
  }
}

const activePhase = computed(() => renderPhase(state.value.phase));

const showStats = computed(
  () => state.value.phase !== "onboarding" && state.value.phase !== "career_end",
);

const hasActiveCareer = computed(
  () => hydrated.value && state.value.phase !== "onboarding" && state.value.phase !== "career_end",
);

onMounted(() => {
  hydrate();
});

setPageSeo({
  title: t("page.game.career.seo.title"),
  description: t("page.game.career.seo.description"),
});

function handleShare() {
  if (!state.value.result) return;
  const encoded = encodeCareerResultForShare(state.value.result);
  const url = `${window.location.origin}${localePath(`/game/career/${state.value.result.id}`)}?d=${encoded}`;
  void navigator.clipboard.writeText(url);
}

function handlePlayAgain() {
  resetCareer();
}

function handleAbandon() {
  if (window.confirm(t("page.game.career.actions.abandonConfirm"))) {
    resetCareer();
  }
}
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <UiCrossCard class="min-h-row-header">
      <div class="flex w-full flex-col items-center justify-center gap-1 py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.career.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("page.game.career.subtitle") }}</p>
      </div>
    </UiCrossCard>

    <UiCard v-if="!hydrated" class="p-6">
      <div class="flex flex-col items-center gap-4">
        <USkeleton class="h-4 w-48" />
        <USkeleton class="h-24 w-full" />
      </div>
    </UiCard>

    <template v-else>
      <UiCard v-if="hasActiveCareer" class="p-4">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium">{{ state.playerName || t("page.game.career.title") }}</p>
          <UButton size="xs" variant="ghost" color="error" @click="handleAbandon">
            {{ t("page.game.career.actions.abandon") }}
          </UButton>
        </div>
      </UiCard>

      <UiCard class="p-4 sm:p-6">
        <div v-if="showStats" class="mb-6">
          <CareerStatsBar :stats="state.stats" />
        </div>

        <CareerOnboarding
          v-if="activePhase === 'onboarding'"
          :step="state.onboardingStep"
          :player-name="state.playerName"
          :region="state.region"
          :role="state.role"
          :background="state.background"
          @update:player-name="setPlayerName"
          @update:step="setOnboardingStep"
          @select-region="setRegion"
          @select-role="setRole"
          @select-background="setBackground"
          @complete="completeOnboarding"
        />

        <div v-else-if="activePhase === 'season_intro'" class="flex flex-col gap-4 text-center">
          <h2 class="text-lg font-semibold tracking-tight">
            {{
              t("page.game.career.season.introTitle", {
                season: state.currentSeason,
                total: TOTAL_SEASONS,
              })
            }}
          </h2>
          <p class="text-sm text-muted text-pretty">
            {{
              t("page.game.career.season.introBody", {
                team: state.currentTeam,
              })
            }}
          </p>
          <UButton block @click="startSeason">
            {{ t("page.game.career.season.begin") }}
          </UButton>
        </div>

        <CareerEventCard
          v-else-if="activePhase === 'event' && currentEvent"
          :event="currentEvent"
          :event-index="state.eventsThisSeason + 1"
          :event-total="EVENTS_PER_SEASON"
          @choose="resolveEventChoice"
        />

        <div v-else-if="activePhase === 'match'" class="flex flex-col gap-4">
          <CareerMatchResults :matches="pendingMatches" :placement-key="pendingPlacement" />
          <UButton block @click="finishMatchPhase">
            {{ t("page.game.career.match.continue") }}
          </UButton>
        </div>

        <CareerOffseasonOffer
          v-else-if="activePhase === 'offseason' && state.pendingOfferTeam"
          :offer-team="state.pendingOfferTeam"
          :current-team="state.currentTeam"
          @accept="acceptOffer"
          @stay="stayWithTeam"
        />

        <CareerEnd
          v-else-if="activePhase === 'career_end' && state.result"
          :result="state.result"
          @share="handleShare"
          @play-again="handlePlayAgain"
        />
      </UiCard>
    </template>
  </section>
</template>
