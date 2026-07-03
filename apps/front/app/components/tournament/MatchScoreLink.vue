<script lang="ts" setup>
import type { MatchResult } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";

const localePath = useLocalePath();

const {
  matchId,
  name,
  teamAName,
  teamBName,
  participantAId,
  participantBId,
  results,
  compact = false,
} = defineProps<{
  matchId: string;
  name?: string;
  teamAName?: string;
  teamBName?: string;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  compact?: boolean;
}>();

const scoreA = computed(() => getMatchParticipantScore(results, participantAId));
const scoreB = computed(() => getMatchParticipantScore(results, participantBId));
</script>

<template>
  <NuxtLink
    :to="localePath(`/matches/${matchId}`)"
    :class="[
      'flex flex-col items-start justify-center gap-1 bg-muted/70 border rounded-sm hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      compact
        ? 'w-64 min-h-16 p-2 border-transparent hover:border-default'
        : 'w-full max-w-xl p-3 border-default',
    ]"
  >
    <p v-if="name" class="text-xs text-dimmed truncate">{{ name }}</p>
    <div class="w-full grid grid-cols-5 gap-1">
      <div class="col-span-4 truncate text-sm">
        {{ teamAName ?? $t("components.match.tbd") }}
      </div>
      <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
        {{ scoreA ?? "–" }}
      </div>
    </div>
    <div class="w-full grid grid-cols-5 gap-1">
      <div class="col-span-4 truncate text-sm">
        {{ teamBName ?? $t("components.match.tbd") }}
      </div>
      <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
        {{ scoreB ?? "–" }}
      </div>
    </div>
  </NuxtLink>
</template>
