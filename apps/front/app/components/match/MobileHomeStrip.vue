<script lang="ts" setup>
import { filterMatchesTodayOrTomorrow } from "~/utils/calendar-day";
import { resolveMatchRailTitleKind } from "~/utils/match-rail-title";

const MAX_MATCHES = 5;
const SOURCE = "home_strip" as const;

const { t } = useI18n();
const { data, pending } = await useUpcomingMatches();

const liveMatches = computed(() => data.value?.live ?? []);
const upcomingMatches = computed(() => filterMatchesTodayOrTomorrow(data.value?.upcoming ?? []));

const matches = computed(() =>
  [...liveMatches.value, ...upcomingMatches.value].slice(0, MAX_MATCHES),
);

const showRail = computed(() => pending.value || matches.value.length > 0);

const upcomingTitle = computed(() => {
  const kind = resolveMatchRailTitleKind(liveMatches.value, upcomingMatches.value);

  switch (kind) {
    case "today": {
      return t("components.match.todaysMatch");
    }

    case "tomorrow": {
      return t("components.match.tomorrowsMatch");
    }

    case "upcoming": {
      return t("components.match.upcomingMatches");
    }

    default: {
      const _exhaustive: never = kind;

      return _exhaustive;
    }
  }
});

const isLive = (matchId: string): boolean => liveMatches.value.some((m) => m.id === matchId);
</script>

<template>
  <div v-if="showRail" class="md:hidden w-full flex flex-col mb-2">
    <HubRail caption="lead" :title="upcomingTitle">
      <HubCard>
        <div class="w-full flex flex-col">
          <template v-if="pending && matches.length === 0">
            <HubListItem v-for="i in 3" :key="i" size="default">
              <div class="grid w-full grid-cols-3 items-center gap-2">
                <div class="col-span-2 flex flex-col gap-1">
                  <SbSkeleton class="h-3 max-w-28" />
                  <SbSkeleton class="h-3 max-w-24" />
                </div>
                <SbSkeleton class="col-span-1 h-3 w-10 justify-self-end" />
              </div>
            </HubListItem>
          </template>
          <template v-else>
            <MatchDiscoveryLink
              v-for="match in matches"
              :key="match.id"
              :match="match"
              :source="SOURCE"
              :status="isLive(match.id) ? 'live' : 'upcoming'"
            >
              <MatchRow :match="match" :live="isLive(match.id)" />
            </MatchDiscoveryLink>
          </template>
        </div>
        <HubListItem
          :to="$localePath('/matches')"
          class="text-sm font-medium text-muted hover:text-highlighted"
        >
          {{ $t("components.match.viewAll") }}
        </HubListItem>
      </HubCard>
    </HubRail>
  </div>
</template>
