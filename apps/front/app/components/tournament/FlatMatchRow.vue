<script lang="ts" setup>
import type { Match } from "~/types/matches";
import { resolveMatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

const { match } = defineProps<{
  match: Match;
}>();

const discoveryStatus = computed(() => resolveMatchDiscoveryStatus(match));
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
    :match-status="discoveryStatus"
    discovery-source="tournament_hub"
    :discovery-status="discoveryStatus"
  />
</template>
