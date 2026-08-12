<script lang="ts" setup>
import { filterMatchesTodayOrTomorrow } from "~/utils/calendarDay";
import { resolveMatchRailTitleKind } from "~/utils/matchRailTitle";

const MAX_MATCHES = 5;
const SOURCE = "home_strip" as const;

const { t } = useI18n();
const { data, pending } = await useUpcomingMatches();

const liveMatches = computed(() => data.value?.live ?? []);
const upcomingMatches = computed(() => filterMatchesTodayOrTomorrow(data.value?.upcoming ?? []));

const matches = computed(() => {
  return [...liveMatches.value, ...upcomingMatches.value].slice(0, MAX_MATCHES);
});

const showRail = computed(() => pending.value || matches.value.length > 0);

const upcomingTitle = computed(() => {
  const kind = resolveMatchRailTitleKind(liveMatches.value, upcomingMatches.value);

  switch (kind) {
    case "today":
      return t("components.match.todaysMatch");
    case "tomorrow":
      return t("components.match.tomorrowsMatch");
    case "upcoming":
      return t("components.match.upcomingMatches");
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
});

function isLive(matchId: string): boolean {
  return liveMatches.value.some((m) => m.id === matchId);
}
</script>

<template>
  <div v-if="showRail" class="md:hidden w-full flex flex-col mb-2">
    <SRail caption="lead" :title="upcomingTitle">
      <SCard>
        <div class="w-full flex flex-col">
          <template v-if="pending && matches.length === 0">
            <SListItem v-for="i in 3" :key="i" size="default" :divider="i < 3">
              <div class="grid w-full grid-cols-3 items-center gap-2">
                <div class="col-span-2 flex flex-col gap-1">
                  <USkeleton class="h-3 max-w-28" />
                  <USkeleton class="h-3 max-w-24" />
                </div>
                <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
              </div>
            </SListItem>
          </template>
          <template v-else>
            <MatchDiscoveryLink
              v-for="(match, index) in matches"
              :key="match.id"
              :match-id="match.id"
              :source="SOURCE"
              :status="isLive(match.id) ? 'live' : 'upcoming'"
            >
              <MatchRow
                :match="match"
                :live="isLive(match.id)"
                :divider="index < matches.length - 1"
              />
            </MatchDiscoveryLink>
          </template>
        </div>
        <div class="border-t border-default px-3 py-2">
          <SLink :to="$localePath('/matches')" variant="muted" class="text-sm">
            {{ $t("components.match.viewAll") }}
          </SLink>
        </div>
      </SCard>
    </SRail>
  </div>
</template>
