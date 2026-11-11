<script lang="ts" setup>
import { distinctStageName, tournamentStagePath } from "@sarpbc/utils";
import type { EntityEventListItem, EntityEventsKind } from "~/types/entity";
import { formatTournamentDateRange, tournamentStatusLabelKey } from "~/utils/tournamentStatus";

const {
  kind,
  upcomingEvents,
  pastEvents,
  liveEvents = [],
  pending = false,
  hasError = false,
} = defineProps<{
  kind: EntityEventsKind;
  upcomingEvents: EntityEventListItem[];
  pastEvents: EntityEventListItem[];
  liveEvents?: EntityEventListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();
const { tab, emptyIcon, setTab } = useEntityListTab("events");
const { isConcealed } = useSpoilerFree();

const headingId = computed(() => `${kind}-events-title`);

const tabItems = computed(() => [
  { value: "upcoming" as const, label: t(`page.${kind}.slug.events.tabs.upcoming`) },
  { value: "past" as const, label: t(`page.${kind}.slug.events.tabs.past`) },
]);

const activeEvents = computed(() => (tab.value === "past" ? pastEvents : upcomingEvents));

const live = computed(() => (tab.value === "upcoming" ? liveEvents : []));

const hasEvents = computed(() => live.value.length > 0 || activeEvents.value.length > 0);

function eventMeta(event: EntityEventListItem): string {
  return [
    distinctStageName(event),
    event.formatLabel,
    formatTournamentDateRange(event.beginAt, event.endAt, locale.value),
  ]
    .filter(Boolean)
    .join(" · ");
}
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <div class="flex w-full items-end justify-between gap-2">
          <h2 :id="headingId">
            {{ t(`page.${kind}.slug.events.sectionTitle`) }}
          </h2>
          <STabs
            :model-value="tab"
            :items="tabItems"
            :ariaLabel="t(`page.${kind}.slug.events.sectionTitle`)"
            @update:model-value="setTab"
          />
        </div>
      </template>

      <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
        <SCard v-for="index in 3" :key="index">
          <div class="flex items-center gap-3 py-2 px-3">
            <USkeleton class="h-3 w-16 shrink-0" />
            <div class="flex flex-1 flex-col gap-1">
              <USkeleton class="h-3 w-40" />
              <USkeleton class="h-3 w-28" />
            </div>
          </div>
        </SCard>
      </div>

      <SCard v-else-if="hasError">
        <SErrorState :message="t(`page.${kind}.slug.events.error`)" @retry="emit('retry')" />
      </SCard>

      <div v-else-if="hasEvents" class="flex flex-col gap-4">
        <div v-if="live.length > 0" class="flex flex-col gap-2">
          <h3 class="flex h-row min-h-row items-end pb-2 pl-2 text-sm font-medium text-highlighted">
            {{ t(`page.${kind}.slug.events.live`) }}
          </h3>
          <div class="flex flex-col border border-separator divide-y divide-separator">
            <ULink
              v-for="event in live"
              :key="event.id"
              :to="$localePath(tournamentStagePath(event.event.slug, event.slug))"
              class="flex items-center gap-3 p-3 interactive-surface"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ event.event.name }}</p>
                <p v-if="eventMeta(event)" class="text-sm text-muted truncate">
                  {{ eventMeta(event) }}
                </p>
              </div>
              <SBadgeLive />
            </ULink>
          </div>
        </div>

        <div
          v-if="activeEvents.length > 0"
          class="flex flex-col border border-separator divide-y divide-separator"
        >
          <ULink
            v-for="event in activeEvents"
            :key="event.id"
            :to="$localePath(tournamentStagePath(event.event.slug, event.slug))"
            class="flex items-center gap-3 p-3 interactive-surface"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ event.event.name }}</p>
              <p v-if="eventMeta(event)" class="text-sm text-muted truncate">
                {{ eventMeta(event) }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span v-if="tab === 'upcoming'" class="text-xs text-muted">
                {{ t(tournamentStatusLabelKey(event.status)) }}
              </span>
              <UBadge
                v-if="tab === 'past' && event.isWinner && !isConcealed({ tournamentId: event.id })"
                color="primary"
                variant="subtle"
                size="sm"
              >
                {{ t(`page.${kind}.slug.events.winner`) }}
              </UBadge>
              <span v-else-if="tab === 'past'" class="text-xs text-muted">
                {{ t(tournamentStatusLabelKey(event.status)) }}
              </span>
            </div>
          </ULink>
        </div>
      </div>

      <SCard v-else>
        <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <UIcon :name="emptyIcon" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t(`page.${kind}.slug.events.${tab}.empty`) }}
          </p>
          <p class="text-xs text-muted text-pretty">
            {{ t(`page.${kind}.slug.events.${tab}.emptyHint`) }}
          </p>
        </div>
      </SCard>
    </SRail>
  </section>
</template>
