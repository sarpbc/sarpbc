<script setup lang="ts">
import { tournamentStagePath } from "@sarpbc/utils";
import type { Match, MatchStatus } from "~/types/matches";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";

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

const tournamentMatchesPath = computed(
  () => `${tournamentStagePath(match.tournament.event.slug, match.tournament.slug)}/matches`,
);
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-muted text-pretty"
  >
    <SBadgeLive v-if="matchStatus === 'live'" />
    <SLink :to="$localePath(tournamentMatchesPath)" variant="muted">
      {{ tournamentStageLabel(match.tournament) }}
    </SLink>
    <span v-if="match.beginAt" class="tabular-nums">
      {{ dateTimeFormatter.format(new Date(match.beginAt)) }}
    </span>
    <span v-if="match.numberOfGames" class="tabular-nums">
      {{ t("page.match.detail.format", { count: match.numberOfGames }) }}
    </span>
  </div>
</template>
