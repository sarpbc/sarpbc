<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import type { Team } from "~/types/team";
import {
  formatTournamentDateRange,
  getTournamentStatus,
  type TournamentStatus,
} from "~/utils/tournamentStatus";

interface Props {
  tournament: Tournament;
}

const { tournament } = defineProps<Props>();
const { t, locale, te } = useI18n();
const { formatTournamentPrizepool } = useCurrency();

const status = computed(() => getTournamentStatus(tournament));

const dateRange = computed(() =>
  formatTournamentDateRange(tournament.beginAt, tournament.endAt, locale.value),
);

const statusLabel = computed(() => {
  const current: TournamentStatus | null = status.value;
  if (!current) return null;

  switch (current) {
    case "live":
      return t("page.tournaments.id.status.live");
    case "upcoming":
      return t("page.tournaments.id.status.upcoming");
    case "finished":
      return t("page.tournaments.id.status.finished");
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
});

const prizepoolLabel = computed(() => {
  const formatted = formatTournamentPrizepool(tournament.prizepool);
  return formatted || null;
});

const teamCount = computed(() => tournament.participants?.length ?? 0);

const teamCountLabel = computed(() => {
  if (teamCount.value <= 0) return null;
  return t("page.tournaments.id.hero.teamsCount", { count: teamCount.value });
});

const typeLabel = computed(() => {
  const type = tournament.type;
  if (!type) return null;
  const key = `components.tournaments.${type}`;
  if (!te(key)) return null;
  return t(key);
});

const metaItems = computed(() => {
  const items: { label: string; tabular: boolean }[] = [];
  if (prizepoolLabel.value) items.push({ label: prizepoolLabel.value, tabular: true });
  if (teamCountLabel.value) items.push({ label: teamCountLabel.value, tabular: true });
  if (typeLabel.value) items.push({ label: typeLabel.value, tabular: false });
  return items;
});

const championTeam = computed((): Team | null => {
  const winner = tournament.winner;
  if (!winner || typeof winner === "string") return null;
  if (!("team" in winner) || !winner.team?.slug) return null;
  return winner.team;
});

const showChampion = computed(() => status.value === "finished" && championTeam.value != null);
</script>

<template>
  <UiCrossCard class="min-h-row-header">
    <div class="w-full flex flex-col items-center gap-3 p-4 text-center">
      <div
        v-if="tournament.league?.imageUrl || tournament.league?.name"
        class="flex items-center justify-center gap-2"
      >
        <img
          v-if="tournament.league?.imageUrl"
          :src="tournament.league.imageUrl"
          :alt="tournament.league.name"
          class="size-4 object-contain outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        />
        <p v-if="tournament.league?.name" class="text-sm text-muted text-pretty">
          {{ tournament.league.name }}
        </p>
      </div>

      <h1 class="text-xl md:text-2xl font-bold tracking-tight text-balance max-w-3xl">
        {{ tournament.name }}
      </h1>

      <div
        v-if="status || dateRange"
        class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted text-pretty"
      >
        <UiBadgeLive v-if="status === 'live'" />
        <span v-else-if="statusLabel">{{ statusLabel }}</span>
        <span v-if="status && dateRange" aria-hidden="true">·</span>
        <span v-if="dateRange" class="tabular-nums">{{ dateRange }}</span>
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

      <p v-if="showChampion && championTeam" class="text-sm text-highlighted text-pretty">
        <span class="text-muted">{{ t("page.tournaments.id.hero.champion") }}</span>
        {{ " " }}
        <UiLink
          :to="$localePath(`/team/${championTeam.slug}`)"
          variant="inline"
          class="inline-flex items-center min-h-10"
        >
          {{ championTeam.name }}
        </UiLink>
      </p>
    </div>
  </UiCrossCard>
</template>
