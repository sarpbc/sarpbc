<script lang="ts" setup>
import type { CareerStint, Player, PlayerCareer } from "@sarpbc/types";
import { playerPath, teamPath, tournamentStagePath } from "@sarpbc/utils";
import type { LocationQueryValue } from "vue-router";

definePageMeta({ key: (route) => route.fullPath });

type Side = "a" | "b";

interface SummaryRow {
  key: string;
  label: string;
  a: string;
  b: string;
  leader: Side | "tie" | null;
}

interface CareerItem {
  key: string;
  label: string;
  meta: string;
  to?: string;
}

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { setPageSeo } = useSarpbcSeo();
const { formatAmount } = usePrizeFormat();
const { awardTypeLabel, seasonAwardTypeLabel } = usePlayerAwardLabels();

function slugParam(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  return Array.isArray(value) ? "" : (value ?? "").trim();
}

const slugA = slugParam(route.query.a);
const slugB = slugParam(route.query.b);

async function loadPlayer(slug: string): Promise<Player | null> {
  return slug ? getPlayerFromSlug(slug) : null;
}

const [
  { data: playerA, error: playerAError, refresh: refreshPlayerA },
  { data: playerB, error: playerBError, refresh: refreshPlayerB },
] = await Promise.all([
  useAsyncData(`player-compare-a-${slugA}`, () => loadPlayer(slugA), {
    default: () => null,
  }),
  useAsyncData(`player-compare-b-${slugB}`, () => loadPlayer(slugB), {
    default: () => null,
  }),
]);

const playerLoadFailed = computed(() => Boolean(playerAError.value || playerBError.value));

const unknownSlugs = computed(() =>
  playerLoadFailed.value
    ? []
    : [...(slugA && !playerA.value ? [slugA] : []), ...(slugB && !playerB.value ? [slugB] : [])],
);

const samePlayer = computed(
  () => Boolean(playerA.value && playerB.value) && playerA.value?.id === playerB.value?.id,
);

if (unknownSlugs.value.length > 0) {
  setResponseStatus(404);
}

const pair = computed(() =>
  playerA.value && playerB.value && !samePlayer.value
    ? { a: playerA.value.slug, b: playerB.value.slug }
    : null,
);

const {
  data: comparison,
  status: comparisonStatus,
  error: comparisonError,
  refresh: refreshComparison,
} = await useAsyncData(
  `player-compare-${pair.value?.a ?? ""}-${pair.value?.b ?? ""}`,
  async () => {
    const current = pair.value;

    return current ? getPlayerComparison(current.a, current.b) : null;
  },
  { default: () => null },
);

function selectPlayer(side: Side, slug: string) {
  router.replace({ query: { ...route.query, [side]: slug } });
}

function retryPlayers() {
  refreshPlayerA();
  refreshPlayerB();
}

const numberFormat = computed(() => new Intl.NumberFormat(locale.value));
const yearFormat = computed(() => new Intl.DateTimeFormat(locale.value, { year: "numeric" }));

function leaderOf(a: number, b: number): Side | "tie" {
  if (a === b) return "tie";

  return a > b ? "a" : "b";
}

function countRow(key: string, label: string, a: number, b: number, compared: boolean): SummaryRow {
  return {
    key,
    label,
    a: numberFormat.value.format(a),
    b: numberFormat.value.format(b),
    leader: compared ? leaderOf(a, b) : null,
  };
}

function awardCount(career: PlayerCareer): number {
  return career.awards.length + career.seasonAwards.length;
}

function teamCount(career: PlayerCareer): number {
  return new Set(career.teams.map(({ team }) => team.id)).size;
}

function earningsRows(a: PlayerCareer, b: PlayerCareer): SummaryRow[] {
  const currencies = [
    ...new Set([...a.earnings.totals, ...b.earnings.totals].map(({ currency }) => currency)),
  ].sort();

  if (currencies.length === 0)
    return [
      {
        key: "earnings",
        label: t("page.player.compare.rows.earnings"),
        a: "—",
        b: "—",
        leader: null,
      },
    ];

  return currencies.map((currency) => {
    const amountA = a.earnings.totals.find((total) => total.currency === currency)?.amount ?? 0;
    const amountB = b.earnings.totals.find((total) => total.currency === currency)?.amount ?? 0;

    return {
      key: `earnings-${currency}`,
      label:
        currencies.length > 1
          ? t("page.player.compare.rows.earningsIn", { currency })
          : t("page.player.compare.rows.earnings"),
      a: formatAmount(amountA, currency),
      b: formatAmount(amountB, currency),
      leader: leaderOf(amountA, amountB),
    };
  });
}

const summaryRows = computed<SummaryRow[]>(() => {
  const current = comparison.value;

  if (!current) return [];
  const { a, b, headToHead } = current;

  return [
    countRow(
      "titles",
      t("page.player.compare.rows.titles"),
      a.titles.length,
      b.titles.length,
      true,
    ),
    countRow(
      "seriesWon",
      t("page.player.compare.rows.seriesWon"),
      a.series.wins,
      b.series.wins,
      true,
    ),
    countRow(
      "seriesLost",
      t("page.player.compare.rows.seriesLost"),
      a.series.losses,
      b.series.losses,
      false,
    ),
    countRow(
      "headToHead",
      t("page.player.compare.rows.headToHead"),
      headToHead.a,
      headToHead.b,
      true,
    ),
    ...earningsRows(a, b),
    countRow("awards", t("page.player.compare.rows.awards"), awardCount(a), awardCount(b), true),
    countRow("teams", t("page.player.compare.rows.teams"), teamCount(a), teamCount(b), false),
  ];
});

function valueClass(row: SummaryRow, side: Side): string {
  if (row.leader === null) return "text-default";

  if (row.leader === "tie") return "text-toned";

  return row.leader === side ? "font-medium text-highlighted" : "text-muted";
}

function yearOf(value: string | null): string | null {
  return value ? yearFormat.value.format(new Date(value)) : null;
}

function stintRange(stint: CareerStint): string {
  const start = yearOf(stint.startDate) ?? "";
  const end = yearOf(stint.endDate) ?? t("page.player.compare.present");

  return start === end ? start : `${start} – ${end}`;
}

function titleItems(career: PlayerCareer): CareerItem[] {
  return career.titles.map((title) => ({
    key: title.id,
    label: title.event.name,
    meta: yearOf(title.endAt) ?? "",
    to: localePath(tournamentStagePath(title.event.slug, title.slug)),
  }));
}

function awardItems(career: PlayerCareer): CareerItem[] {
  return [
    ...career.seasonAwards.map((award) => ({
      key: award.id,
      label: seasonAwardTypeLabel(award.awardType),
      meta: [award.season.name, award.region].filter(Boolean).join(" · "),
    })),
    ...career.awards.map((award) => ({
      key: award.id,
      label: awardTypeLabel(award.awardType),
      meta: award.tournament.event.name,
      to: localePath(tournamentStagePath(award.tournament.event.slug, award.tournament.slug)),
    })),
  ];
}

function teamItems(career: PlayerCareer): CareerItem[] {
  return career.teams.map((stint) => ({
    key: `${stint.team.id}-${stint.startDate}`,
    label: stint.team.name,
    meta:
      stint.role === "active"
        ? stintRange(stint)
        : `${t(`common.contractRole.${stint.role}`)} · ${stintRange(stint)}`,
    to: localePath(teamPath(stint.team.slug)),
  }));
}

const detailSections = computed(() => {
  const current = comparison.value;

  if (!current) return [];

  return [
    {
      key: "titles",
      title: t("page.player.compare.sections.titles"),
      empty: t("page.player.compare.empty.titles"),
      a: titleItems(current.a),
      b: titleItems(current.b),
    },
    {
      key: "awards",
      title: t("page.player.compare.sections.awards"),
      empty: t("page.player.compare.empty.awards"),
      a: awardItems(current.a),
      b: awardItems(current.b),
    },
    {
      key: "teams",
      title: t("page.player.compare.sections.teams"),
      empty: t("page.player.compare.empty.teams"),
      a: teamItems(current.a),
      b: teamItems(current.b),
    },
  ];
});

const sides = computed(() => [
  {
    side: "a" as const,
    player: playerA.value,
    other: playerB.value,
    label: t("page.player.compare.firstPlayer"),
  },
  {
    side: "b" as const,
    player: playerB.value,
    other: playerA.value,
    label: t("page.player.compare.secondPlayer"),
  },
]);

setPageSeo({
  title:
    playerA.value && playerB.value && !samePlayer.value
      ? t("page.player.compare.seoTitleWithNames", { a: playerA.value.name, b: playerB.value.name })
      : t("page.player.compare.seoTitle"),
  description: t("page.player.compare.seoDescription"),
  noIndex: true,
});
</script>

<template>
  <SHubPageBody>
    <div class="flex w-full min-w-0 flex-col gap-8">
      <SCrossCard class="w-full min-w-0">
        <div class="flex w-full min-w-0 flex-col gap-4 p-6">
          <div class="flex flex-col gap-1">
            <h1 class="text-xl font-medium text-highlighted">
              {{ t("page.player.compare.title") }}
            </h1>
            <p class="text-sm text-muted">{{ t("page.player.compare.intro") }}</p>
          </div>
          <div class="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="entry in sides" :key="entry.side" class="flex min-w-0 flex-col gap-3">
              <PlayerComparePicker
                :player="entry.player"
                :label="entry.label"
                :excluded-slug="entry.other?.slug ?? null"
                @select="selectPlayer(entry.side, $event)"
              />
              <SLink
                v-if="entry.player"
                :to="$localePath(playerPath(entry.player.slug))"
                variant="inline"
                class="flex min-w-0 items-center gap-2"
              >
                <PlayerImg
                  :player-name="entry.player.name"
                  :img="entry.player.imageUrl"
                  size="sm"
                />
                <span class="truncate text-sm font-medium">{{ entry.player.name }}</span>
                <span v-if="entry.player.team" class="truncate text-xs text-muted">
                  {{ entry.player.team.name }}
                </span>
              </SLink>
            </div>
          </div>
        </div>
      </SCrossCard>

      <SCard v-if="playerLoadFailed" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.player.compare.loadFailed')" @retry="retryPlayers()" />
      </SCard>

      <SCard
        v-else-if="unknownSlugs.length > 0"
        class="flex min-h-row-stack h-row-grid items-center"
      >
        <SEmptyState
          icon="i-fluent-person-question-mark-24-regular"
          :title="t('page.player.compare.notFound', { slug: unknownSlugs.join(', ') })"
          :hint="t('page.player.compare.notFoundHint')"
        />
      </SCard>

      <SCard v-else-if="samePlayer" class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-people-swap-24-regular"
          :title="t('page.player.compare.samePlayer')"
          :hint="t('page.player.compare.samePlayerHint')"
        />
      </SCard>

      <SCard v-else-if="!pair" class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-people-24-regular"
          :title="t('page.player.compare.choose')"
          :hint="t('page.player.compare.chooseHint')"
        />
      </SCard>

      <SCard v-else-if="comparisonStatus === 'pending'" aria-live="polite">
        <SListItem v-for="index in 6" :key="index" class="grid grid-cols-[1fr_auto_1fr] gap-4">
          <USkeleton class="h-3.5 w-16 justify-self-end" />
          <USkeleton class="h-3 w-24" />
          <USkeleton class="h-3.5 w-16" />
        </SListItem>
      </SCard>

      <SCard
        v-else-if="comparisonError || !comparison"
        class="flex min-h-row-stack h-row-grid items-center"
      >
        <SErrorState :message="t('page.player.compare.error')" @retry="refreshComparison()" />
      </SCard>

      <template v-else>
        <section aria-labelledby="player-compare-summary-title">
          <SRail>
            <template #caption>
              <h2 id="player-compare-summary-title">
                {{ t("page.player.compare.sections.summary") }}
              </h2>
            </template>
            <SCard>
              <table class="w-full table-fixed text-sm">
                <caption class="sr-only">
                  {{
                    t("page.player.compare.tableCaption", {
                      a: comparison.a.player.name,
                      b: comparison.b.player.name,
                    })
                  }}
                </caption>
                <thead class="sr-only">
                  <tr>
                    <th scope="col">{{ comparison.a.player.name }}</th>
                    <th scope="col">{{ t("page.player.compare.statistic") }}</th>
                    <th scope="col">{{ comparison.b.player.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in summaryRows" :key="row.key" class="h-row row-separator">
                    <td :class="['px-2 text-end tabular-nums', valueClass(row, 'a')]">
                      {{ row.a }}
                      <span v-if="row.leader === 'a'" class="sr-only">
                        {{ t("page.player.compare.higher") }}
                      </span>
                    </td>
                    <th scope="row" class="w-2/5 px-2 text-center text-xs font-normal text-muted">
                      {{ row.label }}
                    </th>
                    <td :class="['px-2 text-start tabular-nums', valueClass(row, 'b')]">
                      {{ row.b }}
                      <span v-if="row.leader === 'b'" class="sr-only">
                        {{ t("page.player.compare.higher") }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </SCard>
          </SRail>
        </section>

        <section
          v-for="section in detailSections"
          :key="section.key"
          :aria-labelledby="`player-compare-${section.key}-title`"
        >
          <SRail>
            <template #caption>
              <h2 :id="`player-compare-${section.key}-title`">{{ section.title }}</h2>
            </template>
            <SCard>
              <div class="grid grid-cols-2">
                <ul
                  v-for="column in [
                    { side: 'a', player: comparison.a.player, items: section.a },
                    { side: 'b', player: comparison.b.player, items: section.b },
                  ]"
                  :key="column.side"
                  :aria-label="column.player.name"
                  :class="['min-w-0', column.side === 'b' && 'border-s border-separator']"
                >
                  <li v-for="item in column.items" :key="item.key">
                    <SListItem :to="item.to" class="min-w-0">
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-sm group-hover:text-highlighted">{{
                          item.label
                        }}</span>
                        <span v-if="item.meta" class="truncate text-xs text-muted">{{
                          item.meta
                        }}</span>
                      </div>
                    </SListItem>
                  </li>
                  <li v-if="column.items.length === 0">
                    <SListItem>
                      <span class="truncate text-xs text-muted">{{ section.empty }}</span>
                    </SListItem>
                  </li>
                </ul>
              </div>
            </SCard>
          </SRail>
        </section>
      </template>
    </div>
  </SHubPageBody>
</template>
