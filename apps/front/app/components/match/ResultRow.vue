<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import { getMatchParticipantScore, resolveMatchResultParticipantId } from "~/types/matches";

const {
  match,
  divider = true,
  dividerTop = false,
} = defineProps<{
  match: MatchListItem;
  divider?: boolean;
  /** Top rule inside the row — first row under a lead caption on a `flush-top` card. */
  dividerTop?: boolean;
}>();

const teamA = computed(() => match.participants?.[0]);
const teamB = computed(() => match.participants?.[1]);

const winnerParticipantId = computed(() => {
  if (!match.results || match.results.length < 2) {
    return null;
  }

  const [first, second] = match.results;
  if (first!.score > second!.score) {
    return resolveMatchResultParticipantId(first!.participant);
  }
  if (second!.score > first!.score) {
    return resolveMatchResultParticipantId(second!.participant);
  }

  return null;
});

/** Winner reads heavier and brighter, so the result never relies on colour alone. */
function teamNameClass(participantId: string | undefined): string {
  if (!participantId) {
    return "text-muted";
  }

  return winnerParticipantId.value === participantId ? "text-default font-semibold" : "text-muted";
}

function scoreClass(participantId: string | undefined): string {
  if (!participantId || !winnerParticipantId.value) {
    return "text-toned";
  }

  return winnerParticipantId.value === participantId ? "text-success" : "text-muted";
}
</script>

<template>
  <SListItem size="default" :divider="divider" :divider-top="dividerTop" class="min-w-0">
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
