<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import { daysFromToday, parseMatchDate } from "~/utils/calendarDay";

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
  divider = true,
  dividerTop = false,
  /** When false, always show time only (day headers already provide the date). */
  showDate = true,
} = defineProps<{
  match: MatchListItem;
  live?: boolean;
  divider?: boolean;
  /** Top rule inside the row — first row under a lead caption on a `flush-top` card. */
  dividerTop?: boolean;
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
  return score > other ? "text-success" : "text-muted";
}
</script>

<template>
  <SListItem size="default" :divider="divider" :divider-top="dividerTop">
    <div
      class="grid w-full items-center gap-x-2"
      :class="
        showLiveScore ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'
      "
    >
      <div
        v-if="match.participants"
        class="flex min-w-0 flex-col gap-0.5 truncate text-xs font-medium"
        :class="live ? 'text-toned' : 'text-muted'"
      >
        <span class="truncate" :title="teamAName">{{ teamAName }}</span>
        <span class="truncate" :title="teamBName">{{ teamBName }}</span>
      </div>

      <div v-if="showLiveScore" class="flex items-center justify-center" aria-hidden="true">
        <SBadgeLiveDot />
      </div>

      <div class="flex flex-col items-end justify-center gap-1">
        <DiscussionCommentCount :count="match.commentCount ?? 0" />
        <div
          v-if="showLiveScore"
          class="flex flex-col items-end gap-0.5 text-xs font-semibold tabular-nums"
          :class="{ 'score-flash': scoreChanged }"
          aria-live="polite"
          :aria-label="`${scoreA ?? '–'} – ${scoreB ?? '–'}`"
        >
          <span :class="liveScoreClass(scoreA, scoreB)" aria-hidden="true">
            {{ scoreA ?? "–" }}
          </span>
          <span :class="liveScoreClass(scoreB, scoreA)" aria-hidden="true">
            {{ scoreB ?? "–" }}
          </span>
        </div>
        <SBadgeLive v-else-if="showLiveBadge" />
        <span
          v-else-if="schedule?.kind === 'tomorrow'"
          class="flex flex-col items-end text-end text-xs text-muted font-normal tabular-nums leading-tight"
        >
          <span>{{ schedule.label }}</span>
          <span>{{ schedule.time }}</span>
        </span>
        <span
          v-else-if="schedule?.kind === 'time'"
          class="text-end text-xs text-muted font-normal tabular-nums"
        >
          {{ schedule.time }}
        </span>
      </div>
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
