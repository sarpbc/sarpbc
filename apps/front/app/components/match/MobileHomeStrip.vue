<script lang="ts" setup>
import { resolveMatchRailTitleKind } from "~/utils/matchRailTitle";

const MAX_MATCHES = 5;
const SOURCE = "home_strip" as const;

const { t } = useI18n();
const { data, pending } = await useUpcomingMatches();

const matches = computed(() => {
  if (!data.value) {
    return [];
  }
  return [...data.value.live, ...data.value.upcoming].slice(0, MAX_MATCHES);
});

const showRail = computed(() => pending.value || matches.value.length > 0);

const upcomingTitle = computed(() => {
  const live = data.value?.live ?? [];
  const upcoming = data.value?.upcoming ?? [];
  const kind = resolveMatchRailTitleKind(live, upcoming);

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
  return Boolean(data.value?.live.some((m) => m.id === matchId));
}
</script>

<template>
  <div v-if="showRail" class="md:hidden w-full flex flex-col mb-2">
    <UiRail :title="upcomingTitle">
      <UiCard>
        <div class="w-full flex flex-col">
          <template v-if="pending && matches.length === 0">
            <UiListItem v-for="i in 3" :key="i" size="default" :divider="i < 3">
              <div class="grid w-full grid-cols-3 items-center gap-2">
                <div class="col-span-2 flex flex-col gap-1">
                  <USkeleton class="h-3 max-w-28" />
                  <USkeleton class="h-3 max-w-24" />
                </div>
                <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
              </div>
            </UiListItem>
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
          <UiLink :to="$localePath('/matches')" variant="muted" class="text-sm">
            {{ $t("components.match.viewAll") }}
          </UiLink>
        </div>
      </UiCard>
    </UiRail>
  </div>
</template>
