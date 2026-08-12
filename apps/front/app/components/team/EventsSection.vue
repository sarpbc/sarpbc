<script lang="ts" setup>
import type { TeamEventListItem } from "~/composables/team/useTeamTournaments";
import type { TournamentStatus } from "~/utils/tournamentStatus";
import { formatTournamentDateRange } from "~/utils/tournamentStatus";

type TeamEventsTab = "upcoming" | "past";

const {
  upcomingEvents,
  pastEvents,
  liveEvents = [],
  pending = false,
  hasError = false,
} = defineProps<{
  upcomingEvents: TeamEventListItem[];
  pastEvents: TeamEventListItem[];
  liveEvents?: TeamEventListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const headingId = "team-events-title";

const tab = computed<TeamEventsTab>(() => {
  const value = route.query.events;
  return value === "past" ? "past" : "upcoming";
});

const tabItems = computed(() => [
  { value: "upcoming" as const, label: t("page.team.slug.events.tabs.upcoming") },
  { value: "past" as const, label: t("page.team.slug.events.tabs.past") },
]);

const activeEvents = computed(() => (tab.value === "past" ? pastEvents : upcomingEvents));

const live = computed(() => (tab.value === "upcoming" ? liveEvents : []));

const hasEvents = computed(() => live.value.length > 0 || activeEvents.value.length > 0);

const emptyIcon = computed(() => {
  switch (tab.value) {
    case "upcoming":
      return "i-fluent-calendar-clock-24-regular";
    case "past":
      return "i-fluent-checkmark-circle-24-regular";
    default: {
      const exhaustive: never = tab.value;
      return exhaustive;
    }
  }
});

function setTab(nextTab: TeamEventsTab) {
  const query = { ...route.query };

  if (nextTab === "upcoming") {
    delete query.events;
  } else {
    query.events = nextTab;
  }

  router.replace({ query });
}

function statusLabel(status: TournamentStatus): string {
  switch (status) {
    case "live":
      return t("page.tournaments.id.status.live");
    case "upcoming":
      return t("page.tournaments.id.status.upcoming");
    case "finished":
      return t("page.tournaments.id.status.finished");
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function formatDateRange(event: TeamEventListItem): string | null {
  return formatTournamentDateRange(event.beginAt, event.endAt, locale.value);
}
</script>

<template>
  <section class="w-full flex flex-col gap-3" :aria-labelledby="headingId">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 :id="headingId" class="text-lg font-semibold tracking-tight pl-1">
        {{ t("page.team.slug.events.sectionTitle") }}
      </h2>
      <div class="flex gap-1" role="tablist" :aria-label="t('page.team.slug.events.sectionTitle')">
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          role="tab"
          :aria-selected="tab === item.value"
          variant="soft"
          size="sm"
          :color="tab === item.value ? 'primary' : 'neutral'"
          @click="setTab(item.value)"
        >
          {{ item.label }}
        </UButton>
      </div>
    </div>

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
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.events.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.team.slug.events.retry") }}
        </UButton>
      </div>
    </SCard>

    <div v-else-if="hasEvents" class="flex flex-col gap-4">
      <div v-if="live.length > 0" class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-muted pl-1">
          {{ t("page.team.slug.events.live") }}
        </h3>
        <div class="flex flex-col border border-default divide-y divide-default">
          <ULink
            v-for="event in live"
            :key="event.id"
            :to="$localePath(`/tournaments/${event.id}`)"
            class="flex items-center gap-3 p-3 hover:bg-elevated"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ event.name }}</p>
              <p class="text-sm text-muted truncate">
                <span v-if="event.leagueName">{{ event.leagueName }}</span>
                <span v-if="event.leagueName && event.serie" class="mx-1">·</span>
                <span v-if="event.serie">{{ event.serie }}</span>
                <span
                  v-if="(event.leagueName || event.serie) && formatDateRange(event)"
                  class="mx-1"
                  >·</span
                >
                <span v-if="formatDateRange(event)">{{ formatDateRange(event) }}</span>
              </p>
            </div>
            <SBadgeLive />
          </ULink>
        </div>
      </div>

      <div
        v-if="activeEvents.length > 0"
        class="flex flex-col border border-default divide-y divide-default"
      >
        <ULink
          v-for="event in activeEvents"
          :key="event.id"
          :to="$localePath(`/tournaments/${event.id}`)"
          class="flex items-center gap-3 p-3 hover:bg-elevated"
        >
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ event.name }}</p>
            <p class="text-sm text-muted truncate">
              <span v-if="event.leagueName">{{ event.leagueName }}</span>
              <span v-if="event.leagueName && event.serie" class="mx-1">·</span>
              <span v-if="event.serie">{{ event.serie }}</span>
              <span v-if="(event.leagueName || event.serie) && formatDateRange(event)" class="mx-1"
                >·</span
              >
              <span v-if="formatDateRange(event)">{{ formatDateRange(event) }}</span>
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span v-if="tab === 'upcoming'" class="text-xs font-medium text-muted">
              {{ statusLabel(event.status) }}
            </span>
            <UBadge
              v-if="tab === 'past' && event.isWinner"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ t("page.team.slug.events.winner") }}
            </UBadge>
            <span v-else-if="tab === 'past'" class="text-xs font-medium text-dimmed">
              {{ statusLabel(event.status) }}
            </span>
          </div>
        </ULink>
      </div>
    </div>

    <SCard v-else>
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon :name="emptyIcon" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t(`page.team.slug.events.${tab}.empty`) }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t(`page.team.slug.events.${tab}.emptyHint`) }}
        </p>
      </div>
    </SCard>
  </section>
</template>
