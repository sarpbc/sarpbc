<script lang="ts" setup>
import type { Team } from "~/types/team";
import {
  formatTournamentDateRange,
  getTournamentStatus,
  tournamentStatusLabelKey,
} from "~/utils/tournamentStatus";

const {
  title,
  logoUrl = null,
  leagueName = null,
  beginAt = null,
  endAt = null,
  prizepool = null,
  type = null,
  countLabel = null,
  champion = null,
  calendarPath = null,
} = defineProps<{
  title: string;
  logoUrl?: string | null;
  leagueName?: string | null;
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
  prizepool?: string | null;
  type?: string | null;
  countLabel?: string | null;
  champion?: Team | null;
  calendarPath?: string | null;
}>();

defineSlots<{
  kicker?(): unknown;
  default?(): unknown;
}>();

const { t, locale, te } = useI18n();
const { formatTournamentPrizepool } = useCurrency();

const status = computed(() => getTournamentStatus({ beginAt, endAt }));

const dateRange = computed(() => formatTournamentDateRange(beginAt, endAt, locale.value));

const statusLabel = computed(() =>
  status.value ? t(tournamentStatusLabelKey(status.value)) : null,
);

const typeLabel = computed(() => {
  if (!type) return null;
  const key = `components.tournaments.${type}`;
  return te(key) ? t(key) : null;
});

const metaItems = computed(() => {
  const items: { label: string; tabular: boolean }[] = [];
  const prizepoolLabel = formatTournamentPrizepool(prizepool);
  if (prizepoolLabel) items.push({ label: prizepoolLabel, tabular: true });
  if (countLabel) items.push({ label: countLabel, tabular: true });
  if (typeLabel.value) items.push({ label: typeLabel.value, tabular: false });
  return items;
});

const showChampion = computed(() => status.value === "finished" && champion != null);

const showSubscribeCalendar = computed(
  () => calendarPath != null && (status.value === "live" || status.value === "upcoming"),
);
</script>

<template>
  <SCard class="min-h-row-header">
    <div class="w-full flex flex-col">
      <div class="w-full flex flex-col items-center gap-3 p-4 text-center">
        <div
          v-if="logoUrl || leagueName || $slots.kicker"
          class="flex items-center justify-center gap-2"
        >
          <img v-if="logoUrl" :src="logoUrl" alt="" class="size-4 object-contain" />
          <slot name="kicker">
            <p v-if="leagueName" class="text-sm text-muted text-pretty">
              {{ leagueName }}
            </p>
          </slot>
        </div>

        <h1 class="text-xl font-medium tracking-tight text-balance max-w-3xl">
          {{ title }}
        </h1>

        <div
          v-if="status || dateRange"
          class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted text-pretty"
        >
          <SBadgeLive v-if="status === 'live'" />
          <span v-else-if="statusLabel">{{ statusLabel }}</span>
          <span v-if="status && dateRange" aria-hidden="true">·</span>
          <span v-if="dateRange" class="tabular-nums">{{ dateRange }}</span>
          <template v-if="showSubscribeCalendar && calendarPath">
            <span v-if="status || dateRange" aria-hidden="true">·</span>
            <SLink :to="calendarPath" variant="muted" external>
              {{ t("page.tournaments.id.subscribeCalendar") }}
            </SLink>
          </template>
        </div>

        <div
          v-if="metaItems.length > 0"
          class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted text-pretty"
        >
          <template v-for="(item, index) in metaItems" :key="item.label">
            <span v-if="index > 0" aria-hidden="true">·</span>
            <span :class="{ 'tabular-nums': item.tabular }">{{ item.label }}</span>
          </template>
        </div>

        <p v-if="showChampion && champion" class="text-sm text-highlighted text-pretty">
          <span class="text-muted">{{ t("page.tournaments.id.hero.champion") }}</span>
          {{ " " }}
          <SLink
            :to="$localePath(`/team/${champion.slug}`)"
            variant="inline"
            class="inline-flex items-center min-h-10"
          >
            {{ champion.name }}
          </SLink>
        </p>
      </div>
      <slot />
    </div>
  </SCard>
</template>
