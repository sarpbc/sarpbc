<script lang="ts" setup>
import type { Match } from "~/types/matches";
import { getMatchParticipantScore, getResultParticipantId } from "~/types/matches";

const { match, last = false } = defineProps<{
  match: Match;
  last?: boolean;
}>();

const winnerParticipantId = computed(() => {
  if (!match.results || match.results.length < 2) {
    return null;
  }

  const [first, second] = match.results;
  if (first!.score > second!.score) {
    return getResultParticipantId(first!.participant);
  }
  if (second!.score > first!.score) {
    return getResultParticipantId(second!.participant);
  }

  return null;
});
</script>

<template>
  <div
    class="w-full flex py-1 px-2 items-center"
    :class="{
      'border-b border-default': !last,
    }"
  >
    <div
      v-if="match.participants && match.participants.length === 2"
      class="w-full flex flex-col gap-1 text-xs font-medium text-dimmed truncate"
    >
      <div class="w-full grid grid-cols-3 gap-2">
        <span
          class="col-span-2 truncate"
          :class="winnerParticipantId === match.participants[0]!.id ? 'text-muted' : 'text-dimmed'"
        >
          {{
            match.participants.length > 0
              ? match.participants[0]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
        <span
          class="col-span-1 truncate font-semibold text-end"
          :class="winnerParticipantId === match.participants[0]!.id ? 'text-success' : 'text-error'"
        >
          {{ getMatchParticipantScore(match.results, match.participants[0]!.id) }}
        </span>
      </div>
      <div class="w-full grid grid-cols-3 gap-2">
        <span
          class="col-span-2 truncate"
          :class="winnerParticipantId === match.participants[1]!.id ? 'text-muted' : 'text-dimmed'"
        >
          {{
            match.participants.length > 1
              ? match.participants[1]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
        <span
          class="col-span-1 truncate font-semibold text-end"
          :class="winnerParticipantId === match.participants[1]!.id ? 'text-success' : 'text-error'"
        >
          {{ getMatchParticipantScore(match.results, match.participants[1]!.id) }}
        </span>
      </div>
    </div>
  </div>
</template>
