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
  <div
    class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-muted text-pretty"
  >
    <SBadgeLive v-if="matchStatus === 'live'" />
    <SLink
      v-if="match.tournament"
      :to="$localePath(tournamentMatchesPath(match.tournament.id))"
      variant="muted"
    >
      {{ tournamentLabel(match) }}
    </SLink>
    <span v-if="match.beginAt" class="tabular-nums">
      {{ dateTimeFormatter.format(new Date(match.beginAt)) }}
    </span>
    <span v-if="match.numberOfGames" class="tabular-nums">
      {{ t("page.match.detail.format", { count: match.numberOfGames }) }}
    </span>
  </div>
</template>
