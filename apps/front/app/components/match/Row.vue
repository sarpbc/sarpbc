<script lang="ts" setup>
import type { MatchRowItem } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import { daysFromToday, parseMatchDate } from "~/utils/calendarDay";
import { shortTeamName } from "~/utils/shortTeamName";

const { locale, t } = useI18n();

const hourDf = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      hour: "2-digit",
      minute: "2-digit",
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
  | { kind: "tomorrow"; label: string; time: string };

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
  if (offset === 1) {
    return { kind: "tomorrow", label: t("components.match.tomorrow"), time };
  }

  return { kind: "time", time };
});

const teamA = computed(() => match.participants?.[0]);
const teamB = computed(() => match.participants?.[1]);

const teamAName = computed(() => teamA.value?.team.name ?? t("components.match.tbd"));
const teamBName = computed(() => teamB.value?.team.name ?? t("components.match.tbd"));

const scoreA = computed(() => getMatchParticipantScore(match.results, teamA.value?.id));
const scoreB = computed(() => getMatchParticipantScore(match.results, teamB.value?.id));

/** Live badge only while the series is still 0–0 (or scores not in yet). */
const showLiveBadge = computed(() => {
  if (!live) {
    return false;
  }
  const a = scoreA.value ?? 0;
  const b = scoreB.value ?? 0;
  return a === 0 && b === 0;
});

const showLiveScore = computed(() => live && !showLiveBadge.value);

const FLASH_MS = 2000;
const scoreChanged = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | undefined;

watch([scoreA, scoreB], () => {
  scoreChanged.value = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    scoreChanged.value = false;
  }, FLASH_MS);
});

onBeforeUnmount(() => clearTimeout(flashTimer));

function liveScoreClass(score: number | null, other: number | null): string {
  if (score === null || other === null || score === other) {
    return "text-highlighted";
  }
  return score > other ? "text-highlighted" : "text-muted";
}
</script>

<template>
  <SListItem :size="compact ? 'compact' : 'default'">
    <div
      class="grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto_2rem_auto_minmax(0,1fr)] items-center gap-x-1 text-xs"
    >
      <span v-if="live" class="text-xs font-medium leading-tight text-error">
        {{ $t("components.match.liveShort") }}
      </span>
      <span
        v-else-if="schedule?.kind === 'tomorrow'"
        class="flex flex-col text-muted tabular-nums leading-tight"
      >
        <span class="truncate">{{ schedule.label }}</span>
        <span>{{ schedule.time }}</span>
      </span>
      <span v-else class="text-muted tabular-nums">{{ schedule?.time }}</span>
      <span class="truncate text-end text-default group-hover:text-highlighted" :title="teamAName">
        {{ shortTeamName(teamAName) }}
      </span>
      <TeamImg :team-name="teamA?.team.name" :logo="teamA?.team" size="xs" />
      <span
        class="flex items-center justify-center gap-1 tabular-nums"
        :class="{ 'score-flash': scoreChanged }"
        aria-live="polite"
        :aria-label="showLiveScore ? `${scoreA ?? '–'} – ${scoreB ?? '–'}` : undefined"
      >
        <template v-if="showLiveScore">
          <span :class="liveScoreClass(scoreA, scoreB)" aria-hidden="true">{{
            scoreA ?? "–"
          }}</span>
          <span class="text-muted" aria-hidden="true">-</span>
          <span :class="liveScoreClass(scoreB, scoreA)" aria-hidden="true">{{
            scoreB ?? "–"
          }}</span>
        </template>
        <span v-else class="text-muted" aria-hidden="true">–</span>
      </span>
      <TeamImg :team-name="teamB?.team.name" :logo="teamB?.team" size="xs" />
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
