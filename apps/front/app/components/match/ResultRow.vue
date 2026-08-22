<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";

const { match, divider = true } = defineProps<{
  match: MatchListItem;
  divider?: boolean;
}>();

const teamA = computed(() => match.participants?.[0]);
const teamB = computed(() => match.participants?.[1]);

const winnerParticipantId = computed(() => {
  if (!match.results || match.results.length < 2) {
    return null;
  }

  const [first, second] = match.results;
  if (first!.score > second!.score) {
    return first!.participant;
  }
  if (second!.score > first!.score) {
    return second!.participant;
  }

  return null;
});

function teamNameClass(participantId: string | undefined): string {
  if (!participantId) {
    return "text-dimmed";
  }

  return winnerParticipantId.value === participantId ? "text-muted" : "text-dimmed";
}

function scoreClass(participantId: string | undefined): string {
  if (!participantId || !winnerParticipantId.value) {
    return "text-toned";
  }

  return winnerParticipantId.value === participantId ? "text-success" : "text-error";
}
</script>

<template>
  <SListItem size="default" :divider="divider" class="min-w-0">
    <div
      v-if="teamA && teamB"
      class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs font-medium"
    >
      <span class="truncate" :class="teamNameClass(teamA.id)">
        {{ teamA.team.name || $t("components.match.tbd") }}
      </span>
      <span class="text-end font-semibold tabular-nums" :class="scoreClass(teamA.id)">
        {{ getMatchParticipantScore(match.results, teamA.id) ?? "–" }}
      </span>
      <span class="truncate" :class="teamNameClass(teamB.id)">
        {{ teamB.team.name || $t("components.match.tbd") }}
      </span>
      <span class="text-end font-semibold tabular-nums" :class="scoreClass(teamB.id)">
        {{ getMatchParticipantScore(match.results, teamB.id) ?? "–" }}
      </span>
    </div>
  </SListItem>
</template>
