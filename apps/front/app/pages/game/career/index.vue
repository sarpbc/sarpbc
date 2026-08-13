<script lang="ts" setup>
import CareerEnd from "~/components/career/CareerEnd.vue";
import CareerEventCard from "~/components/career/EventCard.vue";
import CareerEventOutcome from "~/components/career/EventOutcome.vue";
import CareerMenu from "~/components/career/Menu.vue";
import CareerOffseasonOffer from "~/components/career/OffseasonOffer.vue";
import CareerOnboarding from "~/components/career/Onboarding.vue";
import CareerStageResult from "~/components/career/StageResult.vue";
import CareerStatsBar from "~/components/career/StatsBar.vue";
import CareerWorldRankings from "~/components/career/WorldRankings.vue";
import { encodeCareerResultForShare } from "~/composables/useCareerStorage";
import { useCareerSimulator } from "~/composables/useCareerSimulator";
import { getWorldTeamById } from "~/data/career/world";
import { getTeamRank } from "~/utils/career/simulation";
import { WORLDS_QUALIFICATION_POINTS } from "~/types/career";

definePageMeta({
  layout: "game",
});

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
  playerAge,
  isPastPeak,
  canRetire,
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
  continueAfterEventOutcome,
  continueAfterResult,
  resolveOffseasonDestiny,
  acceptOffer,
  stayWithTeam,
  retireCareer,
} = useCareerSimulator();

const onMenu = ref(true);
const hoveredTeamId = ref<string | null>(null);

const showStats = computed(
  () => !onMenu.value && state.value.phase !== "onboarding" && state.value.phase !== "career_end",
);

const hasActiveCareer = computed(
  () =>
    hydrated.value &&
    !onMenu.value &&
    state.value.phase !== "onboarding" &&
    state.value.phase !== "career_end",
);

const canContinue = computed(() => {
  if (!hydrated.value) return false;
  if (state.value.phase !== "onboarding") return true;
  return (
    state.value.onboardingStep !== "intro" ||
    state.value.playerName.length > 0 ||
    state.value.region !== null
  );
});

const continueName = computed(() => {
  if (!canContinue.value) return "";
  if (state.value.playerName && currentTeamName.value) {
    return `${state.value.playerName} · ${currentTeamName.value}`;
  }
  return state.value.playerName;
});

const currentTeamRank = computed(() =>
  state.value.currentTeamId ? getTeamRank(worldRankings.value, state.value.currentTeamId) : null,
);

const offseasonOffers = computed(() =>
  state.value.pendingOfferTeamIds.map((teamId) => ({
    teamId,
    name: getWorldTeamById(teamId)?.name ?? teamId,
    rank: getTeamRank(worldRankings.value, teamId),
  })),
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
  onMenu.value = true;
}

function handleAbandon() {
  if (window.confirm(t("page.game.career.actions.abandonConfirm"))) {
    resetCareer();
    onMenu.value = true;
  }
}

function handleNewCareer() {
  if (canContinue.value && !window.confirm(t("page.game.career.menu.newCareerConfirm"))) {
    return;
  }
  resetCareer();
  onMenu.value = false;
}

function handleContinue() {
  onMenu.value = false;
}
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <SCrossCard v-if="onMenu" class="min-h-row-header">
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

    <div v-else-if="onMenu" class="mx-auto w-full max-w-md">
      <CareerMenu
        :can-continue="canContinue"
        :continue-name="continueName"
        @new-career="handleNewCareer"
        @continue="handleContinue"
      />
    </div>

    <div v-else class="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-4">
      <SHubColumn variant="main" class="order-2 md:order-1 md:col-span-3">
        <CareerWorldRankings
          kind="teams"
          :teams="worldRankings.teams"
          v-model:hovered-team-id="hoveredTeamId"
        />
      </SHubColumn>

      <SHubColumn variant="main" class="order-1 md:order-2 md:col-span-6">
        <div class="flex flex-col gap-4">
          <SCrossCard v-if="hasActiveCareer" class="min-h-row-header">
            <div class="flex w-full items-center justify-between gap-2 px-4 py-3">
              <p class="min-w-0 truncate text-sm font-medium">
                {{ state.playerName || t("page.game.career.title") }}
                <span class="text-muted">· {{ currentTeamName }}</span>
              </p>
              <UButton size="xs" variant="ghost" color="error" @click="handleAbandon">
                {{ t("page.game.career.actions.abandon") }}
              </UButton>
            </div>
          </SCrossCard>

          <div>
            <div v-if="showStats" class="mb-6">
              <CareerStatsBar :stats="state.stats" :age="playerAge" />
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
                    age: playerAge,
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
              <p v-if="isPastPeak" class="text-xs text-muted text-pretty">
                {{ t("page.game.career.season.declineHint") }}
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

            <CareerEventOutcome
              v-else-if="state.phase === 'event_result' && state.lastEventOutcome"
              :outcome="state.lastEventOutcome"
              @continue="continueAfterEventOutcome"
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
              v-else-if="state.phase === 'offseason'"
              :offers="offseasonOffers"
              :current-team-name="currentTeamName"
              :current-team-rank="currentTeamRank"
              :renewal-offered="state.renewalOffered"
              :is-last-chance-offer="state.isLastChanceOffer"
              :can-retire="canRetire"
              :destiny-prompt-pending="state.offseasonDestinyPending"
              @accept="acceptOffer"
              @stay="stayWithTeam"
              @retire="retireCareer"
              @destiny="resolveOffseasonDestiny"
            />

            <CareerEnd
              v-else-if="state.phase === 'career_end' && state.result"
              :result="state.result"
              @share="handleShare"
              @play-again="handlePlayAgain"
            />
          </div>
        </div>
      </SHubColumn>

      <SHubColumn variant="rail" class="order-3 md:col-span-3">
        <CareerWorldRankings
          kind="players"
          :players="worldRankings.players"
          :highlight-team-id="hoveredTeamId"
        />
      </SHubColumn>
    </div>
  </section>
</template>
