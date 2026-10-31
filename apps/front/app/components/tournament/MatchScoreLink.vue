<script lang="ts" setup>
import { matchPath, type ThemedLogo } from "@sarpbc/utils";
import type { MatchLinkTarget, MatchResult, MatchStatus } from "~/types/matches";
import { displayMatchScore, getMatchParticipantScore } from "~/types/matches";
import { formatBracketTeamName } from "~/utils/formatBracketTeamName";
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

const { t } = useI18n();
const localePath = useLocalePath();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const {
  match,
  name,
  teamAName,
  teamBName,
  teamALogo,
  teamBLogo,
  participantAId,
  participantBId,
  results,
  winnerParticipantId = null,
  compact = false,
  bracket = false,
  matchStatus,
  discoverySource,
  discoveryStatus,
} = defineProps<{
  match: MatchLinkTarget;
  name?: string;
  teamAName?: string;
  teamBName?: string;
  teamALogo?: ThemedLogo | null;
  teamBLogo?: ThemedLogo | null;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  winnerParticipantId?: string | null;
  compact?: boolean;
  bracket?: boolean;
  matchStatus: MatchStatus;
  /** When set with discoveryStatus, CTR instrumentation is enabled. */
  discoverySource?: MatchDiscoverySource;
  discoveryStatus?: MatchDiscoveryStatus;
}>();

const detailTo = computed(() => {
  if (discoverySource) {
    return matchDetailTo(match, discoverySource);
  }
  return localePath(matchPath(match.publicId, match.slug));
});

const scoreA = computed(() => getMatchParticipantScore(results, participantAId));
const scoreB = computed(() => getMatchParticipantScore(results, participantBId));

const displayScoreA = computed(() => displayMatchScore(scoreA.value, matchStatus));
const displayScoreB = computed(() => displayMatchScore(scoreB.value, matchStatus));

const showScores = computed(() => displayScoreA.value !== null || displayScoreB.value !== null);

function onMatchClick() {
  if (!discoverySource || !discoveryStatus) {
    return;
  }
  trackMatchRowClicked({
    matchId: match.id,
    source: discoverySource,
    status: discoveryStatus,
  });
}

const displayTeamA = computed(() => {
  if (!teamAName) {
    return t("components.match.tbd");
  }

  return bracket ? formatBracketTeamName(teamAName) : teamAName;
});

const displayTeamB = computed(() => {
  if (!teamBName) {
    return t("components.match.tbd");
  }

  return bracket ? formatBracketTeamName(teamBName) : teamBName;
});

function participantRowClass(participantId: string | undefined): string {
  if (!winnerParticipantId || !participantId) {
    return "";
  }

  return participantId === winnerParticipantId ? "font-medium text-highlighted" : "text-muted";
}
</script>

<template>
  <NuxtLink
    :to="detailTo"
    :class="[
      'flex flex-col interactive-surface',
      bracket
        ? 'w-full p-0 bg-muted/70 border-0'
        : compact
          ? 'w-64 min-h-16 p-2 bg-muted/70 border border-transparent hover:border-default'
          : 'w-full min-w-0 p-2 sm:p-3 bg-muted/70 border border-default',
    ]"
    @click="onMatchClick"
  >
    <p v-if="name && !bracket" class="text-xs text-muted truncate">{{ name }}</p>

    <template v-if="bracket">
      <div
        :class="[
          'grid grid-cols-[auto_1fr_auto] items-center gap-1 min-h-5.5 px-1',
          participantRowClass(participantAId),
        ]"
      >
        <TeamImg :team-name="teamAName ?? $t('components.match.tbd')" :logo="teamALogo" size="xs" />
        <span class="truncate text-xs">{{ displayTeamA }}</span>
        <span v-if="showScores" class="tabular-nums text-xs">{{ displayScoreA }}</span>
      </div>
      <div
        :class="[
          'grid grid-cols-[auto_1fr_auto] items-center gap-1 min-h-5.5 px-1',
          participantRowClass(participantBId),
        ]"
      >
        <TeamImg :team-name="teamBName ?? $t('components.match.tbd')" :logo="teamBLogo" size="xs" />
        <span class="truncate text-xs">{{ displayTeamB }}</span>
        <span v-if="showScores" class="tabular-nums text-xs">{{ displayScoreB }}</span>
      </div>
    </template>

    <template v-else>
      <div
        :class="[
          'w-full grid grid-cols-[1fr_auto] items-center gap-1 rounded-xs px-0.5',
          participantRowClass(participantAId),
        ]"
      >
        <div class="flex min-w-0 items-center gap-1">
          <span :class="['truncate', compact ? 'text-xs' : 'text-sm']">{{ displayTeamA }}</span>
        </div>
        <span :class="['tabular-nums', compact ? 'text-xs' : 'text-sm']">
          <template v-if="showScores">{{ displayScoreA }}</template>
        </span>
      </div>
      <div
        :class="[
          'w-full grid grid-cols-[1fr_auto] items-center gap-1 rounded-xs px-0.5',
          participantRowClass(participantBId),
        ]"
      >
        <div class="flex min-w-0 items-center gap-1">
          <span :class="['truncate', compact ? 'text-xs' : 'text-sm']">{{ displayTeamB }}</span>
        </div>
        <span :class="['tabular-nums', compact ? 'text-xs' : 'text-sm']">
          <template v-if="showScores">{{ displayScoreB }}</template>
        </span>
      </div>
    </template>
  </NuxtLink>
</template>
