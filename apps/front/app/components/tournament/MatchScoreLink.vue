<script lang="ts" setup>
import { matchPath } from "@sarpbc/utils";
import type { ThemedLogo } from "@sarpbc/utils";
import type { MatchLinkTarget, MatchResult, MatchStatus } from "~/types/matches";
import { displayMatchScore, getMatchParticipantScore } from "~/utils/match-score";
import { shortTeamName } from "~/utils/short-team-name";
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/match-discovery-analytics";

const { t } = useI18n();
const localePath = useLocalePath();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const {
  match,
  name = null,
  teamAName = null,
  teamBName = null,
  teamALogo = null,
  teamBLogo = null,
  participantAId = null,
  participantBId = null,
  results = null,
  winnerParticipantId = null,
  tournamentId = null,
  compact = false,
  bracket = false,
  matchStatus,
  discoverySource = null,
  discoveryStatus = null,
} = defineProps<{
  match: MatchLinkTarget;
  name?: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
  teamALogo?: ThemedLogo | null;
  teamBLogo?: ThemedLogo | null;
  participantAId?: string | null;
  participantBId?: string | null;
  results?: MatchResult[] | null;
  winnerParticipantId?: string | null;
  tournamentId?: string | null;
  compact?: boolean;
  bracket?: boolean;
  matchStatus: MatchStatus;
  /** When set with discoveryStatus, CTR instrumentation is enabled. */
  discoverySource?: MatchDiscoverySource | null;
  discoveryStatus?: MatchDiscoveryStatus | null;
}>();

const detailTo = computed(() => {
  if (discoverySource) {
    return matchDetailTo(match, discoverySource);
  }

  return localePath(matchPath(match.publicId, match.slug));
});

const { isConcealed } = useSpoilerFree();

const concealed = computed(() =>
  isConcealed({ matchId: match.id, tournamentId: tournamentId ?? undefined }),
);

const scoreA = computed(() =>
  getMatchParticipantScore(results ?? undefined, participantAId ?? undefined),
);

const scoreB = computed(() =>
  getMatchParticipantScore(results ?? undefined, participantBId ?? undefined),
);

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

  return bracket ? shortTeamName(teamAName) : teamAName;
});

const displayTeamB = computed(() => {
  if (!teamBName) {
    return t("components.match.tbd");
  }

  return bracket ? shortTeamName(teamBName) : teamBName;
});

function participantRowClass(participantId: string | null): string {
  if (concealed.value || !winnerParticipantId || !participantId) {
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
          ? 'w-64 min-h-16 p-2 bg-muted/70 border border-transparent hover:border-separator'
          : 'w-full min-w-0 p-2 sm:p-3 bg-muted/70 border border-separator',
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
        <TeamImg :team-name="teamAName" :logo="teamALogo" size="xs" />
        <span class="truncate text-xs">{{ displayTeamA }}</span>
        <template v-if="showScores">
          <SpoilerHidden v-if="concealed" />
          <span v-else class="tabular-nums text-xs">{{ displayScoreA }}</span>
        </template>
      </div>
      <div
        :class="[
          'grid grid-cols-[auto_1fr_auto] items-center gap-1 min-h-5.5 px-1',
          participantRowClass(participantBId),
        ]"
      >
        <TeamImg :team-name="teamBName" :logo="teamBLogo" size="xs" />
        <span class="truncate text-xs">{{ displayTeamB }}</span>
        <template v-if="showScores">
          <SpoilerHidden v-if="concealed" />
          <span v-else class="tabular-nums text-xs">{{ displayScoreB }}</span>
        </template>
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
          <template v-if="showScores">
            <SpoilerHidden v-if="concealed" />
            <template v-else>{{ displayScoreA }}</template>
          </template>
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
          <template v-if="showScores">
            <SpoilerHidden v-if="concealed" />
            <template v-else>{{ displayScoreB }}</template>
          </template>
        </span>
      </div>
    </template>
  </NuxtLink>
</template>
