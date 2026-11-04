<script lang="ts" setup>
import type { MatchRowItem } from "~/types/matches";
import { getMatchParticipantScore, resolveMatchResultParticipantId } from "~/types/matches";
import { shortTeamName } from "~/utils/shortTeamName";

const { match, compact = false } = defineProps<{
  match: MatchRowItem;
  /** Dense rail rows: three of them span two default rows. */
  compact?: boolean;
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
  <SListItem :size="compact ? 'compact' : 'default'" class="min-w-0">
    <div
      v-if="teamA && teamB"
      class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_2rem_auto_minmax(0,1fr)] items-center gap-x-1 text-xs"
    >
      <span class="truncate text-end" :class="participantClass(teamA.id)" :title="teamA.team.name">
        {{ shortTeamName(teamA.team.name) || $t("components.match.tbd") }}
      </span>
      <TeamImg :team-name="teamA.team.name" :logo="teamA.team" size="xs" />
      <span class="flex items-center justify-center gap-1 tabular-nums">
        <span :class="participantClass(teamA.id)">
          {{ getMatchParticipantScore(match.results, teamA.id) ?? "–" }}
        </span>
        <span class="text-muted" aria-hidden="true">-</span>
        <span :class="participantClass(teamB.id)">
          {{ getMatchParticipantScore(match.results, teamB.id) ?? "–" }}
        </span>
      </span>
      <TeamImg :team-name="teamB.team.name" :logo="teamB.team" size="xs" />
      <span class="truncate" :class="participantClass(teamB.id)" :title="teamB.team.name">
        {{ shortTeamName(teamB.team.name) || $t("components.match.tbd") }}
      </span>
    </div>
  </SListItem>
</template>
