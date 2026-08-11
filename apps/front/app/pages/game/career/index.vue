<script lang="ts" setup>
import CareerEnd from "~/components/career/CareerEnd.vue";
import CareerEventCard from "~/components/career/EventCard.vue";
import CareerOffseasonOffer from "~/components/career/OffseasonOffer.vue";
import CareerOnboarding from "~/components/career/Onboarding.vue";
import CareerStageResult from "~/components/career/StageResult.vue";
import CareerStatsBar from "~/components/career/StatsBar.vue";
import CareerWorldRankings from "~/components/career/WorldRankings.vue";
import { encodeCareerResultForShare } from "~/composables/useCareerStorage";
import { useCareerSimulator } from "~/composables/useCareerSimulator";
import { getWorldTeamById } from "~/data/career/world";
import { getTeamRank } from "~/utils/career/simulation";
import { TOTAL_SEASONS, WORLDS_QUALIFICATION_POINTS } from "~/types/career";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();

const {
  state,
  hydrated,
  currentEvent,
  currentTeamName,
  worldRankings,
  seasonPoints,
  qualifiedForWorlds,
  lastSplit,
  hydrate,
  resetCareer,
  setOnboardingStep,
  setPlayerName,
  setRegion,
  setCountry,
  setRole,
  setBackground,
  completeOnboarding,
  startSeason,
  resolveEventChoice,
  continueAfterResult,
  acceptOffer,
  stayWithTeam,
} = useCareerSimulator();

const showStats = computed(
  () => state.value.phase !== "onboarding" && state.value.phase !== "career_end",
);

const hasActiveCareer = computed(
  () => hydrated.value && state.value.phase !== "onboarding" && state.value.phase !== "career_end",
);

const currentTeamRank = computed(() =>
  state.value.currentTeamId ? getTeamRank(worldRankings.value, state.value.currentTeamId) : null,
);

const offerTeamName = computed(() =>
  state.value.pendingOfferTeamId
    ? (getWorldTeamById(state.value.pendingOfferTeamId)?.name ?? state.value.pendingOfferTeamId)
    : "",
);

const offerTeamRank = computed(() =>
  state.value.pendingOfferTeamId
    ? getTeamRank(worldRankings.value, state.value.pendingOfferTeamId)
    : null,
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
    <SCrossCard class="min-h-row-header">
      <div class="flex w-full flex-col items-center justify-center gap-1 py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.career.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("page.game.career.subtitle") }}</p>
      </div>
    </SCrossCard>

    <SCard v-if="!hydrated" class="p-6">
      <div class="flex flex-col items-center gap-4">
        <USkeleton class="h-4 w-48" />
        <USkeleton class="h-24 w-full" />
      </div>
    </SCard>

    <div v-else class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <div class="flex flex-col gap-4 lg:col-span-2">
        <SCard v-if="hasActiveCareer" class="p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="min-w-0 truncate text-sm font-medium">
              {{ state.playerName || t("page.game.career.title") }}
              <span class="text-muted">· {{ currentTeamName }}</span>
            </p>
            <UButton size="xs" variant="ghost" color="error" @click="handleAbandon">
              {{ t("page.game.career.actions.abandon") }}
            </UButton>
          </div>
        </SCard>

        <SCard class="p-4 sm:p-6">
          <div v-if="showStats" class="mb-6">
            <CareerStatsBar :stats="state.stats" />
          </div>

          <CareerOnboarding
            v-if="state.phase === 'onboarding'"
            :step="state.onboardingStep"
            :player-name="state.playerName"
            :region="state.region"
            :country="state.country"
            :role="state.role"
            :background="state.background"
            @update:player-name="setPlayerName"
            @update:step="setOnboardingStep"
            @select-region="setRegion"
            @select-country="setCountry"
            @select-role="setRole"
            @select-background="setBackground"
            @complete="completeOnboarding"
          />

          <div v-else-if="state.phase === 'season_intro'" class="flex flex-col gap-4 text-center">
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
                  team: currentTeamName,
                  rank: currentTeamRank ?? "—",
                })
              }}
            </p>
            <p class="text-xs text-muted text-pretty">
              {{
                t("page.game.career.season.structure", {
                  points: WORLDS_QUALIFICATION_POINTS,
                })
              }}
            </p>
            <UButton block @click="startSeason">
              {{ t("page.game.career.season.begin") }}
            </UButton>
          </div>

          <CareerEventCard
            v-else-if="state.phase === 'event' && currentEvent"
            :event="currentEvent"
            :stage="state.currentStage"
            @choose="resolveEventChoice"
          />

          <CareerStageResult
            v-else-if="state.phase === 'stage_result'"
            :stage="state.currentStage"
            :split="lastSplit"
            :worlds-placement="state.currentWorlds"
            :season-points="seasonPoints"
            :qualified-for-worlds="qualifiedForWorlds"
            @continue="continueAfterResult"
          />

          <CareerOffseasonOffer
            v-else-if="state.phase === 'offseason' && state.pendingOfferTeamId"
            :offer-team-name="offerTeamName"
            :offer-team-rank="offerTeamRank"
            :current-team-name="currentTeamName"
            :current-team-rank="currentTeamRank"
            @accept="acceptOffer"
            @stay="stayWithTeam"
          />

          <CareerEnd
            v-else-if="state.phase === 'career_end' && state.result"
            :result="state.result"
            @share="handleShare"
            @play-again="handlePlayAgain"
          />
        </SCard>
      </div>

      <SCard class="p-4">
        <CareerWorldRankings :teams="worldRankings.teams" :players="worldRankings.players" />
      </SCard>
    </div>
  </section>
</template>
