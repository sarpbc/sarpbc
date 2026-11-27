<script lang="ts" setup>
import type { TableColumn, TableSort } from "@sarpbc/design";
import { playerPath, teamPath } from "@sarpbc/utils";
import type {
  PlayerStatCounts,
  TournamentPlayerStats,
  TournamentPlayerStatsResponse,
} from "@sarpbc/types";

const { stats, pending, error, caption, emptyTitle, teamFilter, overall } = defineProps<{
  stats: TournamentPlayerStatsResponse | null;
  pending: boolean;
  error: boolean;
  caption: string;
  emptyTitle: string;
  teamFilter?: boolean;
  overall?: boolean;
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

const isColumn = (id: string): id is Column => COLUMNS.some((column) => column === id);

const metric = computed<Column>({
  get: () => (isColumn(sort.value.id) ? sort.value.id : "goals"),
  set: (id) => {
    sort.value = { desc: true, id };
  },
});

const setMetric = (id: string) => {
  if (isColumn(id)) {
    metric.value = id;
  }
};

const metricOptions = computed(() =>
  COLUMNS.map((column) => ({
    label: t(`page.tournaments.stats.metric.${column}`),
    value: column,
  })),
);

const viewOptions = computed(() => [
  { label: t("page.tournaments.stats.totals"), value: "totals" as const },
  { label: t("page.tournaments.stats.perGame"), value: "perGame" as const },
]);

type Team = TournamentPlayerStats["teams"][number];

const teamKey = ({ id, name }: Team) => id ?? name;

const latestTeam = (row: TournamentPlayerStats) => row.teams[0]?.name ?? "";

const teamOptions = computed(() => {
  const teams = new Map<string, string>();

  for (const row of stats?.players ?? []) {
    for (const rowTeam of row.teams) {
      teams.set(teamKey(rowTeam), rowTeam.name);
    }
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

const value = (row: TournamentPlayerStats, column: Column) => {
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

const isSortKey = (id: string): id is SortKey => id === "player" || id === "team" || isColumn(id);

const compare = (a: TournamentPlayerStats, b: TournamentPlayerStats, key: SortKey) => {
  if (key === "player") {
    return a.player.name.localeCompare(b.player.name);
  }

  if (key === "team") {
    return latestTeam(a).localeCompare(latestTeam(b));
  }

  return (value(a, key) ?? -1) - (value(b, key) ?? -1);
};

const rows = computed(() => {
  const { desc, id } = sort.value;
  const key: SortKey = isSortKey(id) ? id : "goals";

  return (stats?.players ?? [])
    .filter(
      (row) =>
        team.value === ALL_TEAMS || row.teams.some((rowTeam) => teamKey(rowTeam) === team.value),
    )
    .toSorted(
      (a, b) => (desc ? -1 : 1) * compare(a, b, key) || a.player.name.localeCompare(b.player.name),
    );
});

const ROWS_PER_PAGE = 50;
const page = ref(1);

watch([rows, view], () => {
  page.value = 1;
});

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * ROWS_PER_PAGE, page.value * ROWS_PER_PAGE),
);

const numberFormat = computed(() => new Intl.NumberFormat(locale.value));

const averageFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
);

const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1, style: "percent" }),
);

const listFormat = computed(() => new Intl.ListFormat(locale.value, { type: "conjunction" }));

const formerTeams = (row: TournamentPlayerStats) =>
  t("page.tournaments.stats.formerTeams", {
    teams: listFormat.value.format(row.teams.slice(1).map(({ name }) => name)),
  });

const display = (row: TournamentPlayerStats, column: Column) => {
  const current = value(row, column);

  if (current === null) {
    return "–";
  }

  if (PERCENTAGES.has(column)) {
    return percentFormat.value.format(current / 100);
  }

  return view.value === "perGame" && column !== "games"
    ? averageFormat.value.format(current)
    : numberFormat.value.format(current);
};

const hasStats = computed(() => (stats?.players.length ?? 0) > 0);

const columns = computed<TableColumn<TournamentPlayerStats>[]>(() => [
  { header: t("page.tournaments.stats.player"), id: "player", meta: { rowHeader: true } },
  ...(overall ? [] : [{ header: t("page.tournaments.stats.team"), id: "team" }]),
  ...COLUMNS.map<TableColumn<TournamentPlayerStats>>((column) => ({
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
    <div
      v-if="!overall && (hasStats || $slots.filters)"
      class="flex flex-wrap items-center gap-2 px-2"
    >
      <slot name="filters" />
      <SSelect
        v-if="teamFilter && hasStats && teamOptions.length > 2"
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

    <div v-if="hasStats && !pending && !error" class="flex items-center gap-2 px-2 md:hidden">
      <SSelect
        :model-value="metric"
        :items="metricOptions"
        :aria-label="t('page.tournaments.stats.sortBy')"
        class="w-full"
        @update:model-value="setMetric"
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
        :title="emptyTitle"
        :hint="t('page.tournaments.stats.emptyHint')"
      />
    </HubCard>

    <HubCard v-else class="flex flex-col">
      <ol class="flex flex-col md:hidden" :aria-label="caption">
        <li v-for="(row, index) in pageRows" :key="row.player.id">
          <HubListItem :to="$localePath(playerPath(row.player.slug))" class="min-w-0 gap-3">
            <span class="w-6 shrink-0 text-right text-sm text-muted tabular-nums">
              {{ (page - 1) * ROWS_PER_PAGE + index + 1 }}
            </span>
            <TeamImg
              v-if="overall"
              :team-name="row.player.currentTeam?.name"
              :logo="row.player.currentTeam"
              size="xs"
            />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-row text-default group-hover:text-highlighted">
                {{ row.player.name }}
              </span>
              <span class="truncate text-xs text-muted">
                <template v-if="!overall && row.teams[0]">{{ row.teams[0].name }} · </template>
                {{ t("page.tournaments.stats.gamesCount", row.games) }}
              </span>
            </span>
            <span class="shrink-0 font-medium text-highlighted tabular-nums">
              {{ display(row, metric) }}
              <span class="sr-only">{{ t(`page.tournaments.stats.metric.${metric}`) }}</span>
            </span>
          </HubListItem>
        </li>
      </ol>
      <STable
        v-model:sorting="sort"
        :caption="caption"
        :columns="columns"
        :data="pageRows"
        class="hidden md:block"
      >
        <template #player-cell="{ row }">
          <span v-if="overall" class="flex max-w-48 items-center gap-2">
            <TeamImg
              :team-name="row.original.player.currentTeam?.name"
              :logo="row.original.player.currentTeam"
              size="xs"
            />
            <SLink :to="$localePath(playerPath(row.original.player.slug))" class="truncate">
              {{ row.original.player.name }}
            </SLink>
          </span>
          <SLink
            v-else
            :to="$localePath(playerPath(row.original.player.slug))"
            class="block max-w-40 truncate"
          >
            {{ row.original.player.name }}
          </SLink>
        </template>
        <template #team-cell="{ row }">
          <span v-if="row.original.teams[0]" class="flex max-w-48 items-center gap-1">
            <SLink
              v-if="row.original.teams[0].slug"
              :to="$localePath(teamPath(row.original.teams[0].slug))"
              class="truncate"
            >
              {{ row.original.teams[0].name }}
            </SLink>
            <span v-else class="truncate text-muted">{{ row.original.teams[0].name }}</span>
            <STooltip v-if="row.original.teams.length > 1" :text="formerTeams(row.original)">
              <span
                tabindex="0"
                class="shrink-0 text-xs text-muted"
                :aria-label="formerTeams(row.original)"
              >
                +{{ row.original.teams.length - 1 }}
              </span>
            </STooltip>
          </span>
        </template>
      </STable>

      <div v-if="rows.length > ROWS_PER_PAGE" class="flex min-h-row items-center justify-center">
        <SPagination v-model:page="page" :total="rows.length" :items-per-page="ROWS_PER_PAGE" />
      </div>

      <p
        v-if="stats && stats.unlinkedAccounts > 0"
        class="flex min-h-row items-center px-2 text-xs text-muted"
      >
        {{ t("page.tournaments.stats.unlinked", stats.unlinkedAccounts) }}
      </p>
    </HubCard>
  </div>
</template>
