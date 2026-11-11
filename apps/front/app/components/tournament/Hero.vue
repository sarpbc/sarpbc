<script lang="ts" setup>
import { participantName, playerPath, teamPath, type SpoilerRevealTarget } from "@sarpbc/utils";
import type { ParticipantRef, TeamSummary, TournamentFormat } from "@sarpbc/types";
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
  format = null,
  calendarPath = null,
  spoilerTournamentIds = [],
} = defineProps<{
  title: string;
  logoUrl?: string | null;
  leagueName?: string | null;
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
  prizepool?: string | null;
  type?: string | null;
  countLabel?: string | null;
  champion?: ParticipantRef<TeamSummary> | null;
  format?: TournamentFormat | null;
  calendarPath?: string | null;
  spoilerTournamentIds?: readonly string[];
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
  const formatLabel = nonDefaultFormatLabel(format);
  if (formatLabel) items.push({ label: formatLabel, tabular: true });
  if (typeLabel.value) items.push({ label: typeLabel.value, tabular: false });
  return items;
});

const championName = computed(() => (champion ? participantName(champion) : ""));

const championPath = computed(() => {
  if (champion?.team) {
    return teamPath(champion.team.slug);
  }
  const [player, ...others] = champion?.players ?? [];
  return player && others.length === 0 ? playerPath(player.slug) : null;
});

const { isConcealed } = useSpoilerFree();

const concealed = computed(() =>
  spoilerTournamentIds.some((tournamentId) => isConcealed({ tournamentId })),
);

const revealTargets = computed((): SpoilerRevealTarget[] =>
  spoilerTournamentIds.map((id) => ({ kind: "tournament", id })),
);

const showReveal = computed(
  () => concealed.value && (status.value === "live" || status.value === "finished"),
);

const showChampion = computed(
  () => status.value === "finished" && champion != null && !concealed.value,
);

const showSubscribeCalendar = computed(
  () => calendarPath != null && (status.value === "live" || status.value === "upcoming"),
);
</script>

<template>
  <SCrossCard class="min-h-row-header">
    <div class="w-full flex flex-col">
      <div class="w-full flex flex-col items-start gap-2 px-6 py-8">
        <div v-if="logoUrl || leagueName || $slots.kicker" class="flex items-center gap-2">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="size-4 object-contain" />
          <slot name="kicker">
            <p v-if="leagueName" class="text-xs text-muted text-pretty">
              {{ leagueName }}
            </p>
          </slot>
        </div>

        <h1 class="max-w-3xl text-3xl font-medium tracking-tight text-highlighted text-balance">
          {{ title }}
        </h1>

        <div
          v-if="status || dateRange"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted text-pretty"
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
          v-if="metaItems.length > 0 || (showChampion && champion) || showReveal"
          class="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-base text-default"
        >
          <span
            v-for="item in metaItems"
            :key="item.label"
            :class="{ 'tabular-nums': item.tabular }"
          >
            {{ item.label }}
          </span>
          <span v-if="showChampion && champion" class="inline-flex items-center gap-2">
            <span class="text-sm text-muted">{{ t("page.tournaments.id.hero.champion") }}</span>
            <SLink
              v-if="championPath"
              :to="$localePath(championPath)"
              variant="inline"
              class="inline-flex min-h-10 items-center gap-2 text-highlighted"
            >
              <TeamImg :team-name="championName" :logo="champion.team" size="xs" />
              {{ championName }}
            </SLink>
            <span v-else class="inline-flex min-h-10 items-center gap-2 text-highlighted">
              <TeamImg :team-name="championName" size="xs" />
              {{ championName }}
            </span>
          </span>
          <SpoilerRevealButton
            v-if="showReveal"
            :targets="revealTargets"
            :label="t('components.spoiler.revealResults')"
            size="sm"
          />
        </div>
      </div>
      <slot />
    </div>
  </SCrossCard>
</template>
