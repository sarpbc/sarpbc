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

function participantClass(participantId: string | undefined): string {
  if (participantId && winnerParticipantId.value === participantId) {
    return "font-medium text-highlighted";
  }

  return winnerParticipantId.value ? "text-muted" : "text-toned";
}
</script>

<template>
  <SListItem size="default" :divider="divider" :divider-top="dividerTop" class="min-w-0">
    <div
      v-if="teamA && teamB"
      class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"
    >
      <span class="truncate" :class="participantClass(teamA.id)">
        {{ teamA.team.name || $t("components.match.tbd") }}
      </span>
      <span class="text-end tabular-nums" :class="participantClass(teamA.id)">
        {{ getMatchParticipantScore(match.results, teamA.id) ?? "–" }}
      </span>
      <span class="truncate" :class="participantClass(teamB.id)">
        {{ teamB.team.name || $t("components.match.tbd") }}
      </span>
      <span class="text-end tabular-nums" :class="participantClass(teamB.id)">
        {{ getMatchParticipantScore(match.results, teamB.id) ?? "–" }}
      </span>
    </div>
  </SListItem>
</template>
