<script lang="ts" setup>
import type { Match } from "~/types/matches";
import { getTeamScore } from "~/utils/tournamentBracket";

const localePath = useLocalePath();

const { match } = defineProps<{
  match: Match;
}>();

const participantA = computed(() => match.participants?.[0]);
const participantB = computed(() => match.participants?.[1]);

const scoreA = computed(() => getTeamScore(match.results, participantA.value?.id));
const scoreB = computed(() => getTeamScore(match.results, participantB.value?.id));
const hasScore = computed(() => scoreA.value !== null && scoreB.value !== null);
</script>

<template>
  <NuxtLink
    :to="localePath(`/matches/${match.id}`)"
    class="w-full max-w-xl flex flex-col gap-1 p-3 bg-muted/70 border border-default rounded-sm hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <p v-if="match.name" class="text-xs text-dimmed truncate">{{ match.name }}</p>
    <div class="w-full grid grid-cols-5 gap-2">
      <div class="col-span-4 truncate text-sm">
        {{ participantA?.team.name ?? $t("components.match.tbd") }}
      </div>
      <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
        {{ hasScore ? scoreA : "–" }}
      </div>
    </div>
    <div class="w-full grid grid-cols-5 gap-2">
      <div class="col-span-4 truncate text-sm">
        {{ participantB?.team.name ?? $t("components.match.tbd") }}
      </div>
      <div class="col-span-1 text-end text-sm tabular-nums font-semibold">
        {{ hasScore ? scoreB : "–" }}
      </div>
    </div>
  </NuxtLink>
</template>
