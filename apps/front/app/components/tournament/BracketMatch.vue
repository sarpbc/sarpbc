<script lang="ts" setup>
import type { DrawnBracketMatch } from "~/types/tournament";
import { getTeamScore } from "~/utils/tournamentBracket";

const localePath = useLocalePath();

const { match } = defineProps<{
  match: DrawnBracketMatch;
}>();

const scoreA = computed(() => getTeamScore(match.results, match.participantAId));
const scoreB = computed(() => getTeamScore(match.results, match.participantBId));

const hasScore = computed(() => scoreA.value !== null && scoreB.value !== null);
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
    <NuxtLink
      :to="localePath(`/matches/${match.matchId}`)"
      class="w-64 min-h-16 flex flex-col items-start justify-center p-2 gap-1 bg-muted/70 border border-transparent rounded-sm hover:border-default hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div class="w-full grid grid-cols-5 gap-1">
        <div class="col-span-4 truncate text-sm">
          {{ match.teamA?.name ?? $t("components.match.tbd") }}
        </div>
        <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
          {{ hasScore ? scoreA : "–" }}
        </div>
      </div>
      <div class="w-full grid grid-cols-5 gap-1">
        <div class="col-span-4 truncate text-sm">
          {{ match.teamB?.name ?? $t("components.match.tbd") }}
        </div>
        <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
          {{ hasScore ? scoreB : "–" }}
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
