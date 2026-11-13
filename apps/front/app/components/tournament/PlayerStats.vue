<script lang="ts" setup>
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
const PERCENTAGES: readonly Column[] = ["shootingPercentage", "goalParticipation"];
const ALL_TEAMS = "all";

const view = ref<View>("totals");
const team = ref(ALL_TEAMS);
const sort = ref<{ key: SortKey; descending: boolean }>({ key: "goals", descending: true });

const viewOptions = computed(() => [
  { value: "totals" as const, label: t("page.tournaments.stats.totals") },
  { value: "perGame" as const, label: t("page.tournaments.stats.perGame") },
]);

function teamKey(row: TournamentPlayerStats): string {
  return row.team.id ?? row.team.name;
}

const teamOptions = computed(() => {
  const teams = new Map<string, string>();
  for (const row of stats?.players ?? []) teams.set(teamKey(row), row.team.name);
  return [
    { value: ALL_TEAMS, label: t("page.tournaments.stats.allTeams") },
    ...[...teams]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
});

watch(
  () => stats,
  () => {
    if (!teamOptions.value.some((option) => option.value === team.value)) team.value = ALL_TEAMS;
  },
);

function value(row: TournamentPlayerStats, column: Column): number | null {
  switch (column) {
    case "games":
      return row.games;
    case "shootingPercentage":
    case "goalParticipation":
      return row[column];
    case "goals":
    case "assists":
    case "saves":
    case "shots":
    case "demolitions":
      return view.value === "totals" ? row.totals[column] : row.perGame[column];
    default: {
      const unreachable: never = column;
      return unreachable;
    }
  }
}

function compare(a: TournamentPlayerStats, b: TournamentPlayerStats, key: SortKey): number {
  if (key === "player") return a.player.name.localeCompare(b.player.name);
  if (key === "team") return a.team.name.localeCompare(b.team.name);
  return (value(a, key) ?? -1) - (value(b, key) ?? -1);
}

const rows = computed(() => {
  const { key, descending } = sort.value;
  return (stats?.players ?? [])
    .filter((row) => team.value === ALL_TEAMS || teamKey(row) === team.value)
    .sort(
      (a, b) =>
        (descending ? -1 : 1) * compare(a, b, key) || a.player.name.localeCompare(b.player.name),
    );
});

function sortBy(key: SortKey): void {
  sort.value =
    sort.value.key === key
      ? { key, descending: !sort.value.descending }
      : { key, descending: key !== "player" && key !== "team" };
}

function ariaSort(key: SortKey): "ascending" | "descending" | undefined {
  if (sort.value.key !== key) return undefined;
  return sort.value.descending ? "descending" : "ascending";
}

const numberFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }),
);
const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: "percent", maximumFractionDigits: 1 }),
);

function display(row: TournamentPlayerStats, column: Column): string {
  const current = value(row, column);
  if (current === null) return "–";
  return PERCENTAGES.includes(column)
    ? percentFormat.value.format(current / 100)
    : numberFormat.value.format(current);
}

const hasStats = computed(() => (stats?.players.length ?? 0) > 0);
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <div v-if="hasStats || $slots.filters" class="flex flex-wrap items-center gap-2 px-2">
      <slot name="filters" />
      <USelect
        v-if="hasStats && teamOptions.length > 2"
        v-model="team"
        :items="teamOptions"
        value-key="value"
        label-key="label"
        :aria-label="t('page.tournaments.stats.team')"
        class="w-48"
      />
      <STextToggle
        v-if="hasStats"
        v-model="view"
        :options="viewOptions"
        :ariaLabel="t('page.tournaments.stats.view')"
        class="ms-auto"
      />
    </div>

    <SCard v-if="pending" class="min-h-row-stack p-2" aria-live="polite">
      <div class="flex w-full flex-col gap-2">
        <USkeleton v-for="index in 6" :key="index" class="h-row" />
      </div>
    </SCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.tournaments.stats.error')" @retry="emit('retry')" />
    </SCard>

    <SCard v-else-if="!hasStats" class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState
        icon="i-fluent-data-bar-vertical-24-regular"
        :title="t('page.tournaments.stats.empty')"
        :hint="t('page.tournaments.stats.emptyHint')"
      />
    </SCard>

    <SCard v-else class="flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">
            {{
              t("page.tournaments.stats.caption")
            }}
          </caption>
          <thead>
            <tr class="h-row border-b border-separator text-xs text-muted">
              <th
                v-for="key in ['player', 'team'] as const"
                :key="key"
                scope="col"
                :aria-sort="ariaSort(key)"
                class="px-2 text-left font-normal"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-highlighted"
                  :class="{ 'text-highlighted': sort.key === key }"
                  @click="sortBy(key)"
                >
                  {{ t(`page.tournaments.stats.${key}`) }}
                </button>
              </th>
              <th
                v-for="column in COLUMNS"
                :key="column"
                scope="col"
                :aria-sort="ariaSort(column)"
                class="px-1 text-right font-normal whitespace-nowrap"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-highlighted"
                  :class="{ 'text-highlighted': sort.key === column }"
                  :aria-label="t(`page.tournaments.stats.columns.${column}.label`)"
                  @click="sortBy(column)"
                >
                  <abbr
                    :title="t(`page.tournaments.stats.columns.${column}.label`)"
                    class="no-underline"
                  >
                    {{ t(`page.tournaments.stats.columns.${column}.short`) }}
                  </abbr>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="`${row.player.id}-${teamKey(row)}`"
              class="h-row border-b border-separator"
            >
              <th scope="row" class="max-w-40 px-2 text-left font-normal">
                <SLink
                  :to="$localePath(playerPath(row.player.slug))"
                  variant="inline"
                  class="block truncate"
                >
                  {{ row.player.name }}
                </SLink>
              </th>
              <td class="max-w-40 px-2">
                <SLink
                  v-if="row.team.slug"
                  :to="$localePath(teamPath(row.team.slug))"
                  variant="muted"
                  class="block truncate"
                >
                  {{ row.team.name }}
                </SLink>
                <span v-else class="block truncate text-muted">{{ row.team.name }}</span>
              </td>
              <td
                v-for="column in COLUMNS"
                :key="column"
                class="px-1 text-right tabular-nums whitespace-nowrap"
              >
                {{ display(row, column) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="flex min-h-row flex-wrap items-center gap-x-2 px-2 text-xs text-muted">
        <span>{{ t("page.match.detail.stats.source") }}</span>
        <span v-if="stats && stats.unlinkedAccounts > 0">
          {{ t("page.tournaments.stats.unlinked", stats.unlinkedAccounts) }}
        </span>
      </p>
    </SCard>
  </div>
</template>
