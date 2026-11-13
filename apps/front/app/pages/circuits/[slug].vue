<script lang="ts" setup>
import { isWorldwideCircuitRegion, teamPath, tournamentEventPath } from "@sarpbc/utils";
import type {
  CircuitEventStatus,
  CircuitStandingCell,
  CircuitStandingRow,
  CircuitStandings,
} from "@sarpbc/types";

interface StandingTableRow {
  row: CircuitStandingRow;
  cells: (CircuitStandingCell | null)[];
  cutoffBelow: boolean;
}

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { formatPlacement } = usePrizeFormat();

const slug = computed(() => String(route.params.slug));

const {
  data: standings,
  pending,
  error,
  refresh,
} = await useAsyncData<CircuitStandings | null>(
  () => `circuit-standings-${slug.value}`,
  () => getCircuitStandings(slug.value),
  { watch: [slug], default: () => null },
);

if (!standings.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.circuits.standings.notFound"),
    failed: t("page.circuits.standings.error"),
  });
}

const numberFormat = computed(() => new Intl.NumberFormat(locale.value));

const tableRows = computed<StandingTableRow[]>(() => {
  const current = standings.value;
  if (!current) return [];
  const spots = current.qualificationSpots;
  const cutoffIndex = spots === null ? -1 : current.rows.findLastIndex((row) => row.rank <= spots);
  return current.rows.map((row, index) => ({
    row,
    cells: current.events.map(
      ({ event }) => row.events.find((cell) => cell.eventId === event.id) ?? null,
    ),
    cutoffBelow: index === cutoffIndex && index < current.rows.length - 1,
  }));
});

const hasCutoff = computed(() => tableRows.value.some((entry) => entry.cutoffBelow));

const regionalRegion = computed(() => {
  const region = standings.value?.region ?? null;
  return region !== null && !isWorldwideCircuitRegion(region) ? region : null;
});

function statusLabel(status: CircuitEventStatus): string | null {
  switch (status) {
    case "scale_missing":
      return t("page.circuits.standings.status.scaleMissing");
    case "upcoming":
      return t("page.circuits.standings.status.upcoming");
    case "in_progress":
      return t("page.circuits.standings.status.inProgress");
    case "awaiting_results":
      return t("page.circuits.standings.status.awaitingResults");
    case "counted":
      return null;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function sourceLabel(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

watch(
  standings,
  (current) => {
    setPageSeo({
      title: current
        ? t("page.circuits.standings.seoTitle", { name: current.name })
        : t("page.circuits.index.seoTitle"),
      description: current
        ? t("page.circuits.standings.seoDescription", { name: current.name })
        : t("page.circuits.index.description"),
    });
  },
  { immediate: true },
);
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>
        <span v-if="standings">{{ standings.name }}</span>
        <USkeleton v-else class="mx-auto h-5 w-48" />
      </template>
      <template #meta>
        <SLink :to="$localePath('/circuits')" variant="muted">
          {{ t("page.circuits.standings.title") }}
        </SLink>
      </template>
    </SHubPageHeader>

    <SCard v-if="pending" aria-live="polite">
      <span class="sr-only">{{ t("common.loading") }}</span>
      <SListItem v-for="index in 6" :key="index" class="gap-3">
        <USkeleton class="h-3 w-6 shrink-0" />
        <USkeleton class="size-4 shrink-0" />
        <USkeleton class="h-3 max-w-40 flex-1" />
        <USkeleton class="h-3 w-12" />
        <USkeleton class="h-3 w-12" />
      </SListItem>
    </SCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.circuits.standings.error')" @retry="refresh()" />
    </SCard>

    <template v-else-if="standings">
      <SCard v-if="!tableRows.length" class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-trophy-24-regular"
          :title="t('page.circuits.standings.empty')"
          :hint="t('page.circuits.standings.emptyHint')"
        />
      </SCard>

      <SCard v-else>
        <div
          class="overflow-x-auto"
          role="region"
          tabindex="0"
          :aria-label="t('page.circuits.standings.caption', { name: standings.name })"
        >
          <table class="w-full text-sm">
            <caption class="sr-only">
              {{
                t("page.circuits.standings.caption", { name: standings.name })
              }}
            </caption>
            <thead>
              <tr class="h-row border-b border-separator text-xs text-muted">
                <th
                  scope="col"
                  class="sticky left-0 z-10 w-10 min-w-10 bg-default px-2 text-left font-normal"
                >
                  <abbr :title="t('page.circuits.standings.rank')" class="no-underline">
                    {{ t("page.circuits.standings.rankShort") }}
                  </abbr>
                </th>
                <th
                  scope="col"
                  class="sticky left-10 z-10 min-w-32 bg-default px-2 text-left font-normal"
                >
                  {{ t("page.circuits.standings.team") }}
                </th>
                <th scope="col" class="px-2 text-right font-normal">
                  {{ t("page.circuits.standings.points") }}
                </th>
                <th
                  v-for="column in standings.events"
                  :key="column.event.id"
                  scope="col"
                  class="min-w-24 max-w-36 px-2 py-2 text-right align-bottom font-normal"
                >
                  <div class="flex flex-col items-end gap-1">
                    <SLink
                      :to="$localePath(tournamentEventPath(column.event.slug))"
                      variant="inline"
                      class="line-clamp-2 text-balance"
                    >
                      {{ column.event.name }}
                    </SLink>
                    <UBadge
                      v-if="statusLabel(column.status)"
                      color="neutral"
                      variant="outline"
                      size="sm"
                    >
                      {{ statusLabel(column.status) }}
                    </UBadge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in tableRows"
                :key="entry.row.team.id"
                class="h-row"
                :class="
                  entry.cutoffBelow ? 'border-b-2 border-primary' : 'border-b border-separator'
                "
              >
                <td
                  class="sticky left-0 z-10 w-10 min-w-10 bg-default px-2 text-muted tabular-nums"
                >
                  {{ entry.row.rank }}
                </td>
                <th
                  scope="row"
                  class="sticky left-10 z-10 min-w-32 max-w-40 bg-default px-2 text-left font-normal sm:max-w-56"
                >
                  <div class="flex min-w-0 items-center gap-2">
                    <TeamImg :team-name="entry.row.team.name" :logo="entry.row.team" size="xs" />
                    <SLink
                      :to="$localePath(teamPath(entry.row.team.slug))"
                      variant="inline"
                      class="min-w-0 truncate font-medium"
                    >
                      {{ entry.row.team.name }}
                    </SLink>
                  </div>
                </th>
                <td class="px-2 text-right font-medium text-highlighted tabular-nums">
                  {{ numberFormat.format(entry.row.points) }}
                </td>
                <td
                  v-for="(cell, index) in entry.cells"
                  :key="standings.events[index]?.event.id ?? index"
                  class="px-2 text-right tabular-nums"
                >
                  <template v-if="cell">
                    <span class="block">{{ numberFormat.format(cell.points) }}</span>
                    <span class="block text-xs text-muted">
                      {{ formatPlacement(cell.placement) }}
                    </span>
                  </template>
                  <template v-else>
                    <span aria-hidden="true" class="text-dimmed">–</span>
                    <span class="sr-only">{{ t("page.circuits.standings.noPoints") }}</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-if="hasCutoff && standings.qualificationSpots"
          class="flex h-row items-center px-2 text-xs text-muted"
        >
          {{ t("page.circuits.standings.qualification", { count: standings.qualificationSpots }) }}
        </p>
      </SCard>

      <section aria-labelledby="circuit-standings-about-title">
        <SRail>
          <template #caption>
            <h2 id="circuit-standings-about-title">
              {{ t("page.circuits.standings.aboutTitle") }}
            </h2>
          </template>
          <SCard class="h-row-grid">
            <div class="flex flex-col gap-2 px-2 py-4 text-sm text-muted">
              <p v-if="standings.description" class="text-default text-pretty">
                {{ standings.description }}
              </p>
              <p class="text-pretty">{{ t("page.circuits.standings.explainer") }}</p>
              <p v-if="regionalRegion" class="text-pretty">
                {{ t("page.circuits.standings.regionalExplainer", { region: regionalRegion }) }}
              </p>
              <div v-if="standings.sourceUrls.length" class="flex flex-col gap-1 text-xs">
                <span>{{ t("page.circuits.standings.scaleSource") }}</span>
                <ul class="flex flex-col gap-1">
                  <li v-for="url in standings.sourceUrls" :key="url" class="min-w-0 truncate">
                    <SLink :to="url" external target="_blank" variant="inline">
                      {{ sourceLabel(url) }}
                    </SLink>
                  </li>
                </ul>
              </div>
            </div>
          </SCard>
        </SRail>
      </section>
    </template>
  </div>
</template>
