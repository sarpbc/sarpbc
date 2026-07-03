<script lang="ts" setup>
import type { DrawnBracketMatch } from "~/types/tournament";

const { match } = defineProps<{
  match: DrawnBracketMatch;
}>();
</script>

<template>
  <div class="w-fit h-fit flex flex-row items-center gap-1">
    <div
      v-if="
        (match.previousMatchA && typeof match.previousMatchA !== 'string') ||
        (match.previousMatchB && typeof match.previousMatchB !== 'string')
      "
      class="flex flex-col gap-1"
    >
      <TournamentBracketMatch
        v-if="match.previousMatchA && typeof match.previousMatchA !== 'string'"
        :match="match.previousMatchA"
      />
      <TournamentBracketMatch
        v-if="match.previousMatchB && typeof match.previousMatchB !== 'string'"
        :match="match.previousMatchB"
      />
    </div>
    <TournamentMatchScoreLink
      compact
      :match-id="match.matchId"
      :team-a-name="match.teamA?.name"
      :team-b-name="match.teamB?.name"
      :participant-a-id="match.participantAId"
      :participant-b-id="match.participantBId"
      :results="match.results"
    />
  </div>
</template>
