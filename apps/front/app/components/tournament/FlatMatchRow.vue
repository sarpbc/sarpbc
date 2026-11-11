<script lang="ts" setup>
import type { TournamentDetailMatch } from "@sarpbc/types";
import { resolveMatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

const { match, tournamentId } = defineProps<{
  match: TournamentDetailMatch;
  tournamentId: string;
}>();

const discoveryStatus = computed(() => resolveMatchDiscoveryStatus(match));
</script>

<template>
  <TournamentMatchScoreLink
    :match="match"
    :name="match.name"
    :team-a-name="slotName(match.participants, 0)"
    :team-b-name="slotName(match.participants, 1)"
    :participant-a-id="match.participants?.[0]?.id"
    :participant-b-id="match.participants?.[1]?.id"
    :results="match.results"
    :tournament-id="tournamentId"
    :match-status="discoveryStatus"
    discovery-source="tournament_hub"
    :discovery-status="discoveryStatus"
  />
</template>
