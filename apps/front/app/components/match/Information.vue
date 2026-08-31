<script setup lang="ts">
import type { Match, MatchStatus } from "~/types/matches";

const { t, locale } = useI18n();

const { match, matchStatus } = defineProps<{
  match: Match;
  matchStatus: MatchStatus;
}>();

const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

function tournamentMatchesPath(tournamentId: string) {
  return `/tournaments/${tournamentId}/matches`;
}

function tournamentLabel(currentMatch: Match) {
  const league = currentMatch.tournament?.league?.name;
  const name = currentMatch.tournament?.name;
  if (league && name) return `${league} ${name}`;
  return name ?? t("page.match.detail.unknownTournament");
}
</script>

<template>
  <div class="flex flex-col items-center justify-center text-sm text-default text-pretty">
    <SLink
      v-if="match.tournament"
      :to="$localePath(tournamentMatchesPath(match.tournament.id))"
      variant="muted"
      class="font-normal"
    >
      {{ tournamentLabel(match) }}
    </SLink>
    <span v-if="match.beginAt" class="tabular-nums text-lg">
      {{ dateTimeFormatter.format(new Date(match.beginAt)) }}
    </span>
    <div
      v-if="match.numberOfGames || matchStatus === 'live'"
      class="flex flex-row items-center gap-2 font-normal text-toned"
    >
      <span v-if="match.numberOfGames" class="tabular-nums">
        {{ t("page.match.detail.format", { count: match.numberOfGames }) }}
      </span>
      <SBadgeLive v-if="matchStatus === 'live'" />
    </div>
  </div>
</template>
