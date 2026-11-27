<script lang="ts" setup>
import { distinctStageName, tournamentStagePath } from "@sarpbc/utils";
import type { ProfileMatchListItem } from "@sarpbc/types";
import type { EntityEventListItem, EntityKind, EntityTrophyListItem } from "~/types/entity";
import { formatTournamentDateRange } from "~/utils/tournament-status";

const OVERVIEW_LIMIT = 6;

const { kind, pastMatches, pastEvents, trophies } = defineProps<{
  kind: EntityKind;
  pastMatches: ProfileMatchListItem[];
  pastEvents: EntityEventListItem[];
  trophies: EntityTrophyListItem[];
}>();

const { t, locale } = useI18n();
const mediumDate = computed(() => mediumDateFormatter(locale.value));

const recentTrophies = computed(() => trophies.slice(0, OVERVIEW_LIMIT));
const recentEvents = computed(() => pastEvents.slice(0, OVERVIEW_LIMIT));

const eventMeta = (event: EntityEventListItem) =>
  [distinctStageName(event), formatTournamentDateRange(event.beginAt, event.endAt, locale.value)]
    .filter(Boolean)
    .join(" · ");
</script>

<template>
  <div
    v-if="pastMatches.length > 0 || recentEvents.length > 0 || recentTrophies.length > 0"
    class="grid w-full gap-8 sm:grid-cols-2"
  >
    <HubRail v-if="pastMatches.length > 0" :title="t('components.entity.overview.recentMatches')">
      <HubCard>
        <MatchLinkRows :matches="pastMatches" variant="result" />
      </HubCard>
    </HubRail>
    <div
      v-if="recentEvents.length > 0 || recentTrophies.length > 0"
      class="flex min-w-0 flex-col gap-8"
    >
      <HubRail v-if="recentTrophies.length > 0" :title="t(`page.${kind}.slug.trophies.title`)">
        <HubCard>
          <HubListItem
            v-for="trophy in recentTrophies"
            :key="trophy.id"
            :to="$localePath(trophy.path)"
            class="min-w-0 gap-3"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-sm text-default group-hover:text-highlighted">
                {{ trophy.displayName }}
              </span>
              <time
                v-if="trophy.endAt"
                :datetime="new Date(trophy.endAt).toISOString()"
                class="text-xs text-muted tabular-nums"
              >
                {{ mediumDate.format(new Date(trophy.endAt)) }}
              </time>
            </span>
          </HubListItem>
        </HubCard>
      </HubRail>
      <HubRail v-if="recentEvents.length > 0" :title="t('components.entity.overview.recentEvents')">
        <HubCard>
          <HubListItem
            v-for="event in recentEvents"
            :key="event.id"
            :to="$localePath(tournamentStagePath(event.event.slug, event.slug))"
            class="min-w-0 gap-3"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-sm text-default group-hover:text-highlighted">
                {{ event.event.name }}
              </span>
              <span class="truncate text-xs text-muted tabular-nums">{{ eventMeta(event) }}</span>
            </span>
          </HubListItem>
        </HubCard>
      </HubRail>
    </div>
  </div>
</template>
