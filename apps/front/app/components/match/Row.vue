<script lang="ts" setup>
import type { MatchRowItem } from "~/types/matches";
import { getMatchParticipantScore } from "~/utils/match-score";
import { daysFromToday, parseMatchDate } from "~/utils/calendar-day";
import { shortTeamName } from "~/utils/short-team-name";

const { locale, t } = useI18n();

const hourDf = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      hour: "numeric",
      minute: "2-digit",
    }),
);

const dayDf = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: "numeric",
      month: "short",
    }),
);

const {
  match,
  live = false,
  compact = false,
  /** When false, always show time only (day headers already provide the date). */
  showDate = true,
} = defineProps<{
  match: MatchRowItem;
  live?: boolean;
  /** Dense rail rows: three of them span two default rows. */
  compact?: boolean;
  showDate?: boolean;
}>();

type ScheduleDisplay =
  | { kind: "time"; time: string }
  | { kind: "tomorrow"; label: string; time: string }
  | { kind: "date"; date: string };

const schedule = computed((): ScheduleDisplay | null => {
  const beginAt = parseMatchDate(match.beginAt);

  if (!beginAt) {
    return null;
  }

  const time = hourDf.value.format(beginAt);

  if (!showDate) {
    return { kind: "time", time };
  }

  const offset = daysFromToday(beginAt);

  if (offset === 0) {
    return { kind: "time", time };
  }

  if (offset === 1) {
    return { kind: "tomorrow", label: t("components.match.tomorrowShort"), time };
  }

  return { kind: "date", date: dayDf.value.format(beginAt) };
});

const teamA = computed(() => match.participants?.[0]);
const teamB = computed(() => match.participants?.[1]);

const teamAName = computed(() => slotName(match.participants, 0) ?? t("components.match.tbd"));
const teamBName = computed(() => slotName(match.participants, 1) ?? t("components.match.tbd"));

const { isConcealed } = useSpoilerFree();

const concealed = computed(() =>
  isConcealed({ matchId: match.id, tournamentId: match.tournament?.id }),
);

const scoreA = computed(() =>
  concealed.value ? null : getMatchParticipantScore(match.results, teamA.value?.id),
);

const scoreB = computed(() =>
  concealed.value ? null : getMatchParticipantScore(match.results, teamB.value?.id),
);

const scoreChanged = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | undefined;

watch([scoreA, scoreB], () => {
  if (concealed.value) {
    return;
  }

  scoreChanged.value = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    scoreChanged.value = false;
  }, HIGHLIGHT_MS);
});

onBeforeUnmount(() => clearTimeout(flashTimer));

const liveScoreClass = (score: number | null, other: number | null): string => {
  if (score === null || other === null || score === other) {
    return "text-highlighted";
  }

  return score > other ? "text-highlighted" : "text-muted";
};
</script>

<template>
  <SListItem :size="compact ? 'compact' : 'default'">
    <div
      class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-1.5 text-xs"
    >
      <span class="truncate text-end text-default group-hover:text-highlighted" :title="teamAName">
        {{ shortTeamName(teamAName) }}
      </span>
      <TeamImg :team-name="slotName(match.participants, 0)" :logo="teamA?.team" size="xs" />
      <span
        class="flex min-w-12 flex-col items-center justify-center text-center tabular-nums leading-tight"
        :class="{ 'score-flash': scoreChanged }"
        aria-live="polite"
        :aria-label="
          live
            ? concealed
              ? `${$t('components.match.liveShort')} ${$t('components.spoiler.hidden')}`
              : `${$t('components.match.liveShort')} ${scoreA ?? '–'} – ${scoreB ?? '–'}`
            : undefined
        "
      >
        <template v-if="live">
          <span class="font-medium text-error" aria-hidden="true">
            {{ $t("components.match.liveShort") }}
          </span>
          <SpoilerHidden v-if="concealed" aria-hidden="true" />
          <span
            v-else-if="scoreA !== null || scoreB !== null"
            class="flex gap-1"
            aria-hidden="true"
          >
            <span :class="liveScoreClass(scoreA, scoreB)">{{ scoreA ?? "–" }}</span>
            <span class="text-muted">-</span>
            <span :class="liveScoreClass(scoreB, scoreA)">{{ scoreB ?? "–" }}</span>
          </span>
        </template>
        <template v-else-if="schedule?.kind === 'tomorrow'">
          <span class="text-muted">{{ schedule.label }}</span>
          <span class="text-default">{{ schedule.time }}</span>
        </template>
        <span v-else-if="schedule?.kind === 'time'" class="text-default">{{ schedule.time }}</span>
        <span v-else-if="schedule?.kind === 'date'" class="text-muted">{{ schedule.date }}</span>
        <span v-else class="text-muted" aria-hidden="true">–</span>
      </span>
      <TeamImg :team-name="slotName(match.participants, 1)" :logo="teamB?.team" size="xs" />
      <span class="truncate text-default group-hover:text-highlighted" :title="teamBName">
        {{ shortTeamName(teamBName) }}
      </span>
    </div>
  </SListItem>
</template>

<style scoped>
.score-flash {
  animation: score-flash var(--duration-emphasis) ease-out;
}

@keyframes score-flash {
  0%,
  15% {
    background-color: color-mix(in srgb, var(--ui-color-primary-500) 18%, transparent);
  }

  100% {
    background-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .score-flash {
    animation: none;
    background-color: color-mix(in srgb, var(--ui-color-primary-500) 12%, transparent);
  }
}
</style>
