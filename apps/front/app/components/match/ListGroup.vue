<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import type { MatchEventGroup } from "~/composables/matches/groupMatchesByEvent";
import type { MatchDiscoverySource } from "~/utils/matchDiscoveryAnalytics";
import { listVariantToDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";
import { formatDayHeaderDate } from "~/utils/dateFormatter";

const { matches, variant, discoverySource, liveMatchIds } = defineProps<{
  matches: MatchListItem[];
  variant: "live" | "upcoming" | "result";
  /** When set, links carry `?from=` and emit `match_row_clicked`. */
  discoverySource?: MatchDiscoverySource;
  /** Match ids treated as live when mixed into an upcoming schedule list. */
  liveMatchIds?: ReadonlySet<string>;
}>();

const { t, locale } = useI18n();

type ListBlock = {
  key: string;
  dateLabel: string | null;
  events: MatchEventGroup[];
};

const useDateGrouping = computed(() => variant === "upcoming");

const blocks = computed((): ListBlock[] => {
  if (!useDateGrouping.value) {
    return [
      {
        key: "all",
        dateLabel: null,
        events: groupMatchesByEvent(matches, t("page.matches.unknownTournament")),
      },
    ];
  }

  return groupMatchesByDateThenEvent(matches, t("page.matches.unknownTournament")).map(
    (dayGroup) => ({
      key: dayGroup.dateKey,
      dateLabel: dayGroup.date
        ? formatDayHeaderDate(dayGroup.date, locale.value)
        : t("page.tournaments.id.matchSections.unknownDate"),
      events: dayGroup.events,
    }),
  );
});

function isLiveMatch(matchId: string): boolean {
  return variant === "live" || Boolean(liveMatchIds?.has(matchId));
}

function discoveryStatusFor(matchId: string) {
  if (variant === "result") {
    return listVariantToDiscoveryStatus("result");
  }
  return isLiveMatch(matchId) ? "live" : "upcoming";
}
</script>

<template>
  <section class="w-full flex flex-col">
    <div v-for="block in blocks" :key="block.key" class="w-full flex flex-col">
      <h3
        v-if="block.dateLabel"
        class="flex h-row min-h-row items-end pb-1 pl-2 text-sm font-medium text-toned"
      >
        {{ block.dateLabel }}
      </h3>

      <SRail v-for="group in block.events" :key="group.key" caption="section">
        <template #caption>
          <h4 class="h-fit min-w-0 truncate text-sm font-medium">
            <SLink
              v-if="group.tournamentId"
              :to="$localePath(`/tournaments/${group.tournamentId}/matches`)"
              variant="muted"
            >
              {{ group.displayName }}
            </SLink>
            <span v-else>{{ group.displayName }}</span>
          </h4>
        </template>

        <SCard
          flush-bottom
          class="flex flex-col"
          :class="
            variant === 'live' ? 'border-error/30 bg-error/5 ring-1 ring-error/15' : undefined
          "
        >
          <MatchDiscoveryLink
            v-for="match in group.matches"
            :key="match.id"
            :match-id="match.id"
            :source="discoverySource"
            :status="discoveryStatusFor(match.id)"
          >
            <MatchRow
              v-if="variant !== 'result'"
              :match="match"
              :live="isLiveMatch(match.id)"
              :show-date="!useDateGrouping"
            />
            <MatchResultRow v-else :match="match" />
          </MatchDiscoveryLink>
        </SCard>
      </SRail>
    </div>
  </section>
</template>
