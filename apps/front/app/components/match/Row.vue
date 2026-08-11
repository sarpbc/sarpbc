<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
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
  result = false,
  /** When false, always show time only (day headers already provide the date). */
  showDate = true,
} = defineProps<{
  match: MatchListItem;
  live?: boolean;
  /** Bottom border between rows. Omit on the last row when a footer owns the separator. */
  divider?: boolean;
  result?: boolean;
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

  // Today (and any other day when showDate is on outside the rail): time only.
  return { kind: "time", time };
});
</script>

<template>
  <UiListItem size="default" :divider="divider">
    <div class="grid w-full grid-cols-3 items-center">
      <div
        v-if="match.participants"
        class="col-span-2 flex flex-col gap-0.5 text-xs font-medium text-dimmed truncate"
      >
        <span>
          {{
            match.participants.length > 0
              ? match.participants[0]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
        <span>
          {{
            match.participants.length > 1
              ? match.participants[1]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
      </div>
      <div v-if="!result" class="col-span-1 flex flex-col items-end justify-center gap-0.5">
        <DiscussionCommentCount :count="match.commentCount ?? 0" />
        <UiBadgeLive v-if="live" />
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
  </UiListItem>
</template>
