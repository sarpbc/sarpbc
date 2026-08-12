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
  /** When false, always show time only (day headers already provide the date). */
  showDate = true,
} = defineProps<{
  match: MatchListItem;
  live?: boolean;
  divider?: boolean;
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

function liveScoreClass(score: number | null, other: number | null): string {
  if (score === null || other === null || score === other) {
    return "text-highlighted";
  }
  return score > other ? "text-success" : "text-muted";
}
</script>

<template>
  <SListItem size="default" :divider="divider">
    <div
      class="grid w-full items-center gap-x-2"
      :class="showLiveScore ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-3'"
    >
      <div
        v-if="match.participants"
        class="flex min-w-0 flex-col gap-0.5 truncate text-xs font-medium"
        :class="[live ? 'text-toned' : 'text-dimmed', showLiveScore ? undefined : 'col-span-2']"
      >
        <span class="truncate">
          {{
            match.participants.length > 0
              ? match.participants[0]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
        <span class="truncate">
          {{
            match.participants.length > 1
              ? match.participants[1]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
      </div>

      <div v-if="showLiveScore" class="flex items-center justify-center" aria-hidden="true">
        <span class="relative flex size-2">
          <span
            class="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-error opacity-75"
          />
          <span class="relative inline-flex size-2 rounded-full bg-error" />
        </span>
      </div>

      <div class="flex flex-col items-end justify-center gap-1">
        <DiscussionCommentCount :count="match.commentCount ?? 0" />
        <div
          v-if="showLiveScore"
          class="flex flex-col items-end gap-0.5 text-xs font-semibold tabular-nums"
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
          class="flex flex-col items-end text-end text-xs text-muted font-thin tabular-nums leading-tight"
        >
          <span>{{ schedule.label }}</span>
          <span>{{ schedule.time }}</span>
        </span>
        <span
          v-else-if="schedule?.kind === 'time'"
          class="text-end text-xs text-muted font-thin tabular-nums"
        >
          {{ schedule.time }}
        </span>
      </div>
    </div>
  </SListItem>
</template>
