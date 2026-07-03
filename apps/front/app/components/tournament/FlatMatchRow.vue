<script lang="ts" setup>
import type { Match } from "~/types/matches";

const { match } = defineProps<{
  match: Match;
}>();
</script>

<template>
  <TournamentMatchScoreLink
    :match-id="match.id"
    :name="match.name"
    :team-a-name="match.participants?.[0]?.team.name"
    :team-b-name="match.participants?.[1]?.team.name"
    :participant-a-id="match.participants?.[0]?.id"
    :participant-b-id="match.participants?.[1]?.id"
    :results="match.results"
  />
</template>
