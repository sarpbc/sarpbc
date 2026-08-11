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

const shortDateDf = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      weekday: "short",
      month: "short",
      day: "numeric",
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

const scheduleLabel = computed(() => {
  const beginAt = parseMatchDate(match.beginAt);
  if (!beginAt) {
    return null;
  }

  const time = hourDf.value.format(beginAt);
  if (!showDate) {
    return time;
  }

  const offset = daysFromToday(beginAt);
  if (offset === 0) {
    return time;
  }
  if (offset === 1) {
    return `${t("components.match.tomorrow")} · ${time}`;
  }

  return `${shortDateDf.value.format(beginAt)} · ${time}`;
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
      <div v-if="!result" class="col-span-1 flex flex-col items-end justify-center gap-1">
        <DiscussionCommentCount :count="match.commentCount ?? 0" />
        <UiBadgeLive v-if="live" />
        <span v-else-if="scheduleLabel" class="text-end text-xs text-muted font-thin tabular-nums">
          {{ scheduleLabel }}
        </span>
      </div>
    </div>
  </UiListItem>
</template>
