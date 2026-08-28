<script setup lang="ts">
import type { Match, MatchStatus } from "~/types/matches";
import { matchCalendarPath } from "~/utils/calendar/ics";
import { pickOfficialStreamUrl } from "~/utils/officialStream";

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

const showAddToCalendar = computed(
  () => Boolean(match.beginAt) && (matchStatus === "upcoming" || matchStatus === "live"),
);

const watchStreamUrl = computed(() => {
  if (matchStatus === "finished") {
    return null;
  }

  return pickOfficialStreamUrl(match.officialStreams, locale.value);
});

const statusLabel = computed(() => {
  switch (matchStatus) {
    case "live":
      return t("page.match.detail.status.live");
    case "finished":
      return t("page.match.detail.status.finished");
    case "upcoming":
      return t("page.match.detail.status.upcoming");
    default: {
      const _exhaustive: never = matchStatus;
      return _exhaustive;
    }
  }
});
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
    <template v-if="match.beginAt">
      <span class="tabular-nums text-lg">
        {{ dateTimeFormatter.format(new Date(match.beginAt)) }}
      </span>
    </template>
    <template v-if="match.numberOfGames">
      <span class="tabular-nums font-normal text-toned">
        {{ t("page.match.detail.format", { count: match.numberOfGames }) }}
      </span>
    </template>
    <SBadgeLive v-if="matchStatus === 'live'" />
    <span v-else class="font-normal text-toned">{{ statusLabel }}</span>
    <template v-if="watchStreamUrl">
      <SLink
        :to="watchStreamUrl"
        variant="muted"
        external
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("page.match.detail.watchStream") }}
      </SLink>
    </template>
    <template v-if="showAddToCalendar">
      <SLink :to="matchCalendarPath(match.id)" variant="muted" external>
        {{ t("page.match.detail.addToCalendar") }}
      </SLink>
    </template>
  </div>
</template>
