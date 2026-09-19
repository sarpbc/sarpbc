<script lang="ts" setup>
import CareerEnd from "~/components/career/CareerEnd.vue";
import CareerEventCard from "~/components/career/EventCard.vue";
import CareerEventOutcome from "~/components/career/EventOutcome.vue";
import CareerOffseasonOffer from "~/components/career/OffseasonOffer.vue";
import CareerOnboarding from "~/components/career/Onboarding.vue";
import CareerSeasonIntro from "~/components/career/SeasonIntro.vue";
import CareerStageResult from "~/components/career/StageResult.vue";
import CareerStatsBar from "~/components/career/StatsBar.vue";
import CareerWorldRankings from "~/components/career/WorldRankings.vue";
import { useCareerSimulatorContext } from "~/composables/useCareerSimulator";
import { showCareerStats } from "~/utils/career/careerReducer";

const emit = defineEmits<{
  share: [];
  playAgain: [];
  abandon: [];
}>();

const {
  state,
  currentEvent,
  currentTeamName,
  worldRankings,
  seasonPoints,
  qualifiedForWorlds,
  lastSplit,
  playerAge,
  canRetire,
  destinyPromptPending,
  currentTeamRank,
  currentTeamRegion,
  offseasonOffers,
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
} = useCareerSimulatorContext();

const hoveredTeamId = ref<string | null>(null);

const phase = computed(() => state.value.phase);
</script>

<template>
  <div class="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-4">
    <SHubColumn variant="main" class="order-2 md:order-1 md:col-span-3">
      <CareerWorldRankings
        kind="teams"
        :teams="worldRankings.teams"
        v-model:hovered-team-id="hoveredTeamId"
      />
    </SHubColumn>

    <SHubColumn variant="main" class="order-1 md:order-2 md:col-span-6">
      <div class="flex flex-col gap-4">
        <SCrossCard class="h-row-header">
          <div class="flex h-full w-full items-center justify-between gap-2 px-4">
            <p class="min-w-0 truncate text-sm font-medium">
              {{ state.playerName || $t("page.game.career.title") }}
              <span class="text-muted">· {{ currentTeamName }}</span>
            </p>
            <UButton size="xs" variant="ghost" color="error" @click="emit('abandon')">
              {{ $t("page.game.career.actions.abandon") }}
            </UButton>
          </div>
        </SCrossCard>

        <div>
          <div v-if="showCareerStats(phase)" class="mb-6">
            <CareerStatsBar :stats="state.stats" :age="playerAge" />
          </div>

          <CareerOnboarding
            v-if="phase === 'onboarding'"
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

          <CareerSeasonIntro
            v-else-if="phase === 'season_intro'"
            :season="state.currentSeason"
            :age="playerAge"
            :team-name="currentTeamName"
            :team-rank="currentTeamRank"
            @begin="startSeason"
          />

          <CareerEventCard
            v-else-if="phase === 'event' && currentEvent"
            :event="currentEvent"
            :stage="state.currentStage"
            :decision-index="state.eventsResolvedForStage + 1"
            :decision-count="state.eventsQueuedForStage"
            @choose="resolveEventChoice"
          />

          <CareerEventOutcome
            v-else-if="phase === 'event_result' && state.lastEventOutcome"
            :outcome="state.lastEventOutcome"
            @continue="continueAfterEventOutcome"
          />

          <CareerStageResult
            v-else-if="phase === 'stage_result'"
            :stage="state.currentStage"
            :split="lastSplit"
            :worlds-placement="state.currentWorlds"
            :season-points="seasonPoints"
            :qualified-for-worlds="qualifiedForWorlds"
            :region="currentTeamRegion"
            @continue="continueAfterResult"
          />

          <CareerOffseasonOffer
            v-else-if="phase === 'offseason'"
            :offers="offseasonOffers"
            :current-team-id="state.currentTeamId"
            :current-team-name="currentTeamName"
            :current-team-rank="currentTeamRank"
            :renewal-offered="state.renewalOffered"
            :is-last-chance-offer="state.isLastChanceOffer"
            :can-retire="canRetire"
            :destiny-prompt-pending="destinyPromptPending"
            v-model:hovered-team-id="hoveredTeamId"
            @accept="acceptOffer"
            @stay="stayWithTeam"
            @retire="retireCareer"
            @destiny="resolveOffseasonDestiny"
          />

          <CareerEnd
            v-else-if="phase === 'career_end' && state.result"
            :result="state.result"
            @share="emit('share')"
            @play-again="emit('playAgain')"
          />

          <template v-else-if="phase === 'menu'" />

          <p v-else class="text-sm text-muted">
            {{ $t("page.game.career.share.notFound") }}
          </p>
        </div>
      </div>
    </SHubColumn>

    <SHubColumn variant="rail" class="order-3 md:col-span-3">
      <CareerWorldRankings
        kind="players"
        :players="worldRankings.players"
        v-model:hovered-team-id="hoveredTeamId"
      />
    </SHubColumn>
  </div>
</template>
