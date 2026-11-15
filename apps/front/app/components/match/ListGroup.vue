<script lang="ts" setup>
import type { MatchListItem } from "@sarpbc/types";
import type { MatchEventGroup } from "~/types/matches";
import type { MatchDiscoverySource } from "~/utils/match-discovery-analytics";
import { formatDayHeaderDate } from "~/utils/date-formatter";

const {
  matches,
  variant,
  discoverySource = null,
  liveMatchIds = null,
} = defineProps<{
  matches: MatchListItem[];
  variant: "live" | "upcoming" | "result";
  /** When set, links carry `?from=` and emit `match_row_clicked`. */
  discoverySource?: MatchDiscoverySource | null;
  /** Match ids treated as live when mixed into an upcoming schedule list. */
  liveMatchIds?: ReadonlySet<string> | null;
}>();

const { t, locale } = useI18n();

interface ListBlock {
  key: string;
  dateLabel: string | null;
  events: MatchEventGroup[];
}

const useDateGrouping = computed(() => variant === "upcoming");

const blocks = computed((): ListBlock[] => {
  if (!useDateGrouping.value) {
    return [
      {
        dateLabel: null,
        events: groupMatchesByEvent(matches),
        key: "all",
      },
    ];
  }

  return groupByDay(matches, (match) => match.beginAt, "asc").map((dayGroup) => ({
    dateLabel: dayGroup.date
      ? formatDayHeaderDate(dayGroup.date, locale.value)
      : t("page.tournaments.id.matchSections.unknownDate"),
    events: groupMatchesByEvent(dayGroup.items),
    key: dayGroup.dateKey,
  }));
});
</script>

<template>
  <section class="w-full flex flex-col">
    <div v-for="block in blocks" :key="block.key" class="w-full flex flex-col">
      <h3
        v-if="block.dateLabel"
        class="flex h-row min-h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted"
      >
        {{ block.dateLabel }}
      </h3>

      <HubRail v-for="group in block.events" :key="group.key" caption="section">
        <template #caption>
          <h4 class="h-fit min-w-0 truncate text-sm font-medium">
            <SLink :to="$localePath(group.matchesPath)" variant="muted">
              {{ group.displayName }}
            </SLink>
          </h4>
        </template>

        <HubCard
          class="flex flex-col"
          :class="
            variant === 'live' ? 'border-error/30 bg-error/5 ring-1 ring-error/15' : undefined
          "
        >
          <MatchLinkRows
            :matches="group.matches"
            :variant="variant"
            :source="discoverySource"
            :live-match-ids="liveMatchIds"
            :show-date="!useDateGrouping"
          />
        </HubCard>
      </HubRail>
    </div>
  </section>
</template>
