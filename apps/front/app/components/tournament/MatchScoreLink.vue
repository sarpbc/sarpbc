<script lang="ts" setup>
import type { MatchResult } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";

const localePath = useLocalePath();

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
}>();

const scoreA = computed(() => getMatchParticipantScore(results, participantAId));
const scoreB = computed(() => getMatchParticipantScore(results, participantBId));

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
    :to="localePath(`/matches/${matchId}`)"
    :class="[
      'flex flex-col items-start justify-center gap-0.5 border rounded-sm hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      bracket
        ? 'w-full min-h-13 p-1 bg-muted/70 border-default/60 hover:border-default'
        : compact
          ? 'w-64 min-h-16 p-2 bg-muted/70 border-transparent hover:border-default'
          : 'w-full max-w-xl p-3 bg-muted/70 border-default',
    ]"
  >
    <p v-if="name && !bracket" class="text-xs text-dimmed truncate">{{ name }}</p>
    <div
      :class="[
        'w-full grid grid-cols-[1fr_auto] items-center gap-1 rounded-xs px-0.5',
        participantRowClass(participantAId),
      ]"
    >
      <div class="flex min-w-0 items-center gap-1">
        <TeamImg
          v-if="bracket"
          :team-name="teamAName ?? $t('components.match.tbd')"
          :image-url="teamAImageUrl"
          size="xs"
        />
        <span :class="['truncate', bracket ? 'text-xs' : 'text-sm']">
          {{ teamAName ?? $t("components.match.tbd") }}
        </span>
      </div>
      <span :class="['tabular-nums font-semibold', bracket ? 'text-xs' : 'text-sm']">
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
        <TeamImg
          v-if="bracket"
          :team-name="teamBName ?? $t('components.match.tbd')"
          :image-url="teamBImageUrl"
          size="xs"
        />
        <span :class="['truncate', bracket ? 'text-xs' : 'text-sm']">
          {{ teamBName ?? $t("components.match.tbd") }}
        </span>
      </div>
      <span :class="['tabular-nums font-semibold', bracket ? 'text-xs' : 'text-sm']">
        {{ scoreB ?? "–" }}
      </span>
    </div>
  </NuxtLink>
</template>
