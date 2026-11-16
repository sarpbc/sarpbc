<script lang="ts" setup>
import type { TableColumn, TableSort } from "@sarpbc/design";
import { playerPath, teamPath } from "@sarpbc/utils";
import type {
  PlayerStatCounts,
  TournamentPlayerStats,
  TournamentPlayerStatsResponse,
} from "@sarpbc/types";

const { stats, pending, error } = defineProps<{
  stats: TournamentPlayerStatsResponse | null;
  pending: boolean;
  error: boolean;
}>();

const emit = defineEmits<{ retry: [] }>();

const { t, locale } = useI18n();

type View = "totals" | "perGame";

type Count = keyof PlayerStatCounts;

type Column = "games" | Count | "shootingPercentage" | "goalParticipation";

type SortKey = "player" | "team" | Column;

const COLUMNS: readonly Column[] = [
  "games",
  "goals",
  "assists",
  "saves",
  "shots",
  "shootingPercentage",
  "demolitions",
  "goalParticipation",
];

const PERCENTAGES: ReadonlySet<Column> = new Set(["shootingPercentage", "goalParticipation"]);
const ALL_TEAMS = "all";

const view = ref<View>("totals");
const team = ref(ALL_TEAMS);
const sort = ref<TableSort>({ desc: true, id: "goals" });

const setView = (value: string) => {
  if (value === "totals" || value === "perGame") {
    view.value = value;
  }
};

const viewOptions = computed(() => [
  { label: t("page.tournaments.stats.totals"), value: "totals" as const },
  { label: t("page.tournaments.stats.perGame"), value: "perGame" as const },
]);

const teamKey = (row: TournamentPlayerStats): string => row.team.id ?? row.team.name;

const teamOptions = computed(() => {
  const teams = new Map<string, string>();

  for (const row of stats?.players ?? []) {
    teams.set(teamKey(row), row.team.name);
  }

  return [
    { label: t("page.tournaments.stats.allTeams"), value: ALL_TEAMS },
    ...[...teams]
      .map(([teamId, label]) => ({ label, value: teamId }))
      .toSorted((a, b) => a.label.localeCompare(b.label)),
  ];
});

watch(
  () => stats,
  () => {
    if (!teamOptions.value.some((option) => option.value === team.value)) {
      team.value = ALL_TEAMS;
    }
  },
);

const value = (row: TournamentPlayerStats, column: Column): number | null => {
  switch (column) {
    case "games": {
      return row.games;
    }

    case "shootingPercentage":
    case "goalParticipation": {
      return row[column];
    }

    case "goals":
    case "assists":
    case "saves":
    case "shots":
    case "demolitions": {
      return view.value === "totals" ? row.totals[column] : row.perGame[column];
    }

    default: {
      const unreachable: never = column;

      return unreachable;
    }
  }
};

const isSortKey = (id: string): id is SortKey =>
  id === "player" || id === "team" || COLUMNS.some((column) => column === id);

const compare = (a: TournamentPlayerStats, b: TournamentPlayerStats, key: SortKey): number => {
  if (key === "player") {
    return a.player.name.localeCompare(b.player.name);
  }

  if (key === "team") {
    return a.team.name.localeCompare(b.team.name);
  }

  return (value(a, key) ?? -1) - (value(b, key) ?? -1);
};

const rows = computed(() => {
  const { desc, id } = sort.value;
  const key: SortKey = isSortKey(id) ? id : "goals";

  return (stats?.players ?? [])
    .filter((row) => team.value === ALL_TEAMS || teamKey(row) === team.value)
    .toSorted(
      (a, b) => (desc ? -1 : 1) * compare(a, b, key) || a.player.name.localeCompare(b.player.name),
    );
});

const numberFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }),
);

const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1, style: "percent" }),
);

const display = (row: TournamentPlayerStats, column: Column): string => {
  const current = value(row, column);

  if (current === null) {
    return "–";
  }

  return PERCENTAGES.has(column)
    ? percentFormat.value.format(current / 100)
    : numberFormat.value.format(current);
};

const hasStats = computed(() => (stats?.players.length ?? 0) > 0);

/* Stat headers are abbreviations; the full name is their title and what screen readers say. */
const columns = computed((): TableColumn<TournamentPlayerStats>[] => [
  { header: t("page.tournaments.stats.player"), id: "player", meta: { rowHeader: true } },
  { header: t("page.tournaments.stats.team"), id: "team" },
  ...COLUMNS.map((column): TableColumn<TournamentPlayerStats> => ({
    cell: ({ row }) => display(row.original, column),
    header: () =>
      h(
        "abbr",
        {
          "aria-label": t(`page.tournaments.stats.columns.${column}.label`),
          class: "no-underline",
          title: t(`page.tournaments.stats.columns.${column}.label`),
        },
        t(`page.tournaments.stats.columns.${column}.short`),
      ),
    id: column,
    meta: { align: "end" },
    sortDescFirst: true,
  })),
]);
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <div v-if="hasStats || $slots.filters" class="flex flex-wrap items-center gap-2 px-2">
      <slot name="filters" />
      <SSelect
        v-if="hasStats && teamOptions.length > 2"
        v-model="team"
        :items="teamOptions"
        :aria-label="t('page.tournaments.stats.team')"
        class="w-48"
      />
      <STabs
        v-if="hasStats"
        :model-value="view"
        :items="viewOptions"
        :ariaLabel="t('page.tournaments.stats.view')"
        class="ms-auto"
        @update:model-value="setView"
      />
    </div>

    <HubCard v-if="pending" class="min-h-row-stack p-2" aria-live="polite">
      <div class="flex w-full flex-col gap-2">
        <SSkeleton v-for="index in 6" :key="index" class="h-row" />
      </div>
    </HubCard>

    <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.stats.error')" @retry="emit('retry')" />
    </HubCard>

    <HubCard v-else-if="!hasStats" class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState
        icon="i-fluent-data-bar-vertical-24-regular"
        :title="t('page.tournaments.stats.empty')"
        :hint="t('page.tournaments.stats.emptyHint')"
      />
    </HubCard>

    <HubCard v-else class="flex flex-col">
      <STable
        v-model:sorting="sort"
        :caption="t('page.tournaments.stats.caption')"
        :columns="columns"
        :data="rows"
      >
        <template #player-cell="{ row }">
          <SLink
            :to="$localePath(playerPath(row.original.player.slug))"
            class="block max-w-40 truncate"
          >
            {{ row.original.player.name }}
          </SLink>
        </template>
        <template #team-cell="{ row }">
          <SLink
            v-if="row.original.team.slug"
            :to="$localePath(teamPath(row.original.team.slug))"
            class="block max-w-40 truncate"
          >
            {{ row.original.team.name }}
          </SLink>
          <span v-else class="block max-w-40 truncate text-muted">{{
            row.original.team.name
          }}</span>
        </template>
      </STable>

      <p class="flex min-h-row flex-wrap items-center gap-x-2 px-2 text-xs text-muted">
        <span>{{ t("page.match.detail.stats.source") }}</span>
        <span v-if="stats && stats.unlinkedAccounts > 0">
          {{ t("page.tournaments.stats.unlinked", stats.unlinkedAccounts) }}
        </span>
      </p>
    </HubCard>
  </div>
</template>
