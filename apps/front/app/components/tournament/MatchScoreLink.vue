<script lang="ts" setup>
import type { MatchResult } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import { formatBracketTeamName } from "~/utils/formatBracketTeamName";
import { resolveMatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

const { t } = useI18n();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const {
  matchId,
  name,
  teamAName,
  teamBName,
  teamAImageUrl,
  teamBImageUrl,
  participantAId,
  participantBId,
  results,
  winnerParticipantId = null,
  compact = false,
  bracket = false,
  beginAt = null,
  endAt = null,
  status = null,
} = defineProps<{
  matchId: string;
  name?: string;
  teamAName?: string;
  teamBName?: string;
  teamAImageUrl?: string;
  teamBImageUrl?: string;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  winnerParticipantId?: string | null;
  compact?: boolean;
  bracket?: boolean;
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
  status?: string | null;
}>();

const SOURCE = "tournament_hub" as const;

const detailTo = computed(() => matchDetailTo(matchId, SOURCE));

const scoreA = computed(() => getMatchParticipantScore(results, participantAId));
const scoreB = computed(() => getMatchParticipantScore(results, participantBId));

function onMatchClick() {
  let discoveryStatus = resolveMatchDiscoveryStatus({ beginAt, endAt, status });
  if (
    discoveryStatus === "upcoming" &&
    (winnerParticipantId || (results !== undefined && results.length > 0))
  ) {
    discoveryStatus = "finished";
  }

  trackMatchRowClicked({
    matchId,
    source: SOURCE,
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

  if (participantId === winnerParticipantId) {
    return "bg-success/15 text-success";
  }

  return "bg-error/5 text-muted";
}
</script>

<template>
  <NuxtLink
    :to="detailTo"
    :class="[
      'flex flex-col rounded-sm hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary',
      bracket
        ? 'w-full p-0 bg-muted/70 border-0'
        : compact
          ? 'w-64 min-h-16 p-2 bg-muted/70 border border-transparent hover:border-default'
          : 'w-full max-w-xl p-3 bg-muted/70 border border-default',
    ]"
    @click="onMatchClick"
  >
    <p v-if="name && !bracket" class="text-xs text-dimmed truncate">{{ name }}</p>

    <template v-if="bracket">
      <div
        :class="[
          'grid grid-cols-[auto_1fr_auto] items-center gap-1 min-h-[22px] px-1',
          participantRowClass(participantAId),
        ]"
      >
        <TeamImg
          :team-name="teamAName ?? $t('components.match.tbd')"
          :image-url="teamAImageUrl"
          size="xs"
        />
        <span class="truncate text-xs">{{ displayTeamA }}</span>
        <span class="tabular-nums font-semibold text-xs">{{ scoreA ?? "–" }}</span>
      </div>
      <div
        :class="[
          'grid grid-cols-[auto_1fr_auto] items-center gap-1 min-h-[22px] px-1',
          participantRowClass(participantBId),
        ]"
      >
        <TeamImg
          :team-name="teamBName ?? $t('components.match.tbd')"
          :image-url="teamBImageUrl"
          size="xs"
        />
        <span class="truncate text-xs">{{ displayTeamB }}</span>
        <span class="tabular-nums font-semibold text-xs">{{ scoreB ?? "–" }}</span>
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
        <span :class="['tabular-nums font-semibold', compact ? 'text-xs' : 'text-sm']">
          {{ scoreA ?? "–" }}
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
        <span :class="['tabular-nums font-semibold', compact ? 'text-xs' : 'text-sm']">
          {{ scoreB ?? "–" }}
        </span>
      </div>
    </template>
  </NuxtLink>
</template>
