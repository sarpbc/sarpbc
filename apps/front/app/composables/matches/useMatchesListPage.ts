import type { MatchListItem, MatchesPageData } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

export const MATCHES_PER_PAGE = 20;

/** Live matches are pinned above tab content and are not paginated. */
const LIVE_MATCHES_FETCH_LIMIT = 100;

/** Sentinel for "All" — USelect reserves empty string for clearing the selection. */
export const MATCHES_FILTER_ALL = "__all__";

export type MatchesTab = "upcoming" | "past";

export type MatchFilterOption = {
  value: string;
  label: string;
};

/**
 * User-facing "tournament" = League in the API (e.g. RLCS, TFT).
 * Sub-events (Spring Major, etc.) are Tournament entities under that league.
 * URL query `tournament` holds a league id; the API receives it as `leagueId`.
 */
export function useMatchesListPage() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const localePath = useLocalePath();

  const tab = computed<MatchesTab>(() => {
    const value = route.query.tab as string;
    return value === "past" ? "past" : "upcoming";
  });

  const offset = computed(() => {
    const param = route.query.offset as string;
    const parsed = param ? parseInt(param, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  const selectedTournamentFilter = computed(() => {
    const value = route.query.tournament ?? route.query.leagueId;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  });

  const hasActiveFilters = computed(() => Boolean(selectedTournamentFilter.value));

  const { data: tournamentsForFilter } = useAsyncData(
    "matches-filter-tournaments",
    () => getAllTournaments({ limit: 100 }),
    { default: () => [] as Tournament[] },
  );

  const tournamentFilterOptions = computed<MatchFilterOption[]>(() => {
    const byId = new Map<string, MatchFilterOption>();

    for (const tournament of tournamentsForFilter.value ?? []) {
      const league = tournament.league;
      if (league?.id && league.name) {
        byId.set(league.id, { value: league.id, label: league.name });
      }
    }

    return [
      { value: MATCHES_FILTER_ALL, label: t("page.matches.filters.allTournaments") },
      ...Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  });

  const selectedTournamentFilterValue = computed(
    () => selectedTournamentFilter.value ?? MATCHES_FILTER_ALL,
  );

  function buildMatchesQuery(
    overrides: Partial<{
      tab: MatchesTab;
      offset: string;
      tournament: string | undefined;
    }> = {},
  ) {
    const query: Record<string, string> = {};

    const nextTab = overrides.tab ?? tab.value;
    if (nextTab !== "upcoming") {
      query.tab = nextTab;
    }

    const nextOffset = overrides.offset ?? String(offset.value);
    if (nextOffset !== "0") {
      query.offset = nextOffset;
    }

    const nextTournament =
      "tournament" in overrides ? overrides.tournament : selectedTournamentFilter.value;

    if (nextTournament) {
      query.tournament = nextTournament;
    }

    return query;
  }

  function navigateMatches(overrides: Parameters<typeof buildMatchesQuery>[0]) {
    router.push({
      path: localePath("/matches"),
      query: buildMatchesQuery(overrides),
    });
  }

  const listQuery = computed(() => ({
    limit: MATCHES_PER_PAGE,
    offset: offset.value,
    leagueId: selectedTournamentFilter.value,
  }));

  const liveListQuery = computed(() => ({
    limit: LIVE_MATCHES_FETCH_LIMIT,
    offset: 0,
    leagueId: selectedTournamentFilter.value,
  }));

  const {
    data: liveMatchesData,
    pending: livePending,
    error: liveError,
    refresh: refreshLiveMatches,
  } = useLazyAsyncData<MatchListItem[]>(
    () => `matches-live-${selectedTournamentFilter.value ?? ""}`,
    async () => {
      const response = await getUpcomingMatches(liveListQuery.value);
      return response.live;
    },
    {
      watch: [selectedTournamentFilter],
      default: () => [] as MatchListItem[],
    },
  );

  const {
    data: matchesData,
    pending: tabPending,
    error: tabError,
    refresh: refreshTabMatches,
  } = useLazyAsyncData<MatchesPageData | null>(
    () => `matches-${tab.value}-${offset.value}-${selectedTournamentFilter.value ?? ""}`,
    (): Promise<MatchesPageData> => {
      return tab.value === "past"
        ? getMatchesResults(listQuery.value)
        : getUpcomingMatches(listQuery.value);
    },
    {
      watch: [tab, offset, selectedTournamentFilter],
      default: () => null,
    },
  );

  const pending = computed(() => tabPending.value || livePending.value);
  const error = computed(() => tabError.value ?? liveError.value);

  function refresh() {
    return Promise.all([refreshTabMatches(), refreshLiveMatches()]);
  }

  const liveMatches = computed(() => liveMatchesData.value ?? []);

  const upcomingMatches = computed(() =>
    tab.value === "upcoming" && matchesData.value && "upcoming" in matchesData.value
      ? matchesData.value.upcoming
      : [],
  );

  const pastMatches = computed(() =>
    tab.value === "past" && matchesData.value && "results" in matchesData.value
      ? matchesData.value.results
      : [],
  );

  const totalMatches = computed(() => {
    if (!matchesData.value) return 0;
    if ("total" in matchesData.value && tab.value === "upcoming") {
      return matchesData.value.total;
    }
    if ("total" in matchesData.value && tab.value === "past") {
      return matchesData.value.total;
    }
    return 0;
  });

  const hasMatches = computed(() => {
    if (liveMatches.value.length > 0) {
      return true;
    }
    if (tab.value === "past") {
      return pastMatches.value.length > 0;
    }
    return upcomingMatches.value.length > 0;
  });

  const currentPage = computed(() => Math.floor(offset.value / MATCHES_PER_PAGE) + 1);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalMatches.value / MATCHES_PER_PAGE)));

  const hasPrevious = computed(() => offset.value > 0);
  const hasNext = computed(() => offset.value + MATCHES_PER_PAGE < totalMatches.value);

  const tabItems = computed(() => [
    { value: "upcoming" as const, label: t("page.matches.tabs.upcoming") },
    { value: "past" as const, label: t("page.matches.tabs.past") },
  ]);

  function getTabQuery(nextTab: MatchesTab) {
    return buildMatchesQuery({ tab: nextTab, offset: "0" });
  }

  function getPageQuery(nextOffset: number) {
    return buildMatchesQuery({ offset: String(Math.max(0, nextOffset)) });
  }

  function onTournamentFilterChange(value: string | number | boolean | undefined) {
    if (typeof value !== "string") return;

    navigateMatches({
      tournament: value === MATCHES_FILTER_ALL ? undefined : value,
      offset: "0",
    });
  }

  function clearFilters() {
    navigateMatches({
      tournament: undefined,
      offset: "0",
    });
  }

  return {
    tab,
    offset,
    hasActiveFilters,
    tournamentFilterOptions,
    selectedTournamentFilterValue,
    pending,
    error,
    refresh,
    liveMatches,
    upcomingMatches,
    pastMatches,
    totalMatches,
    hasMatches,
    currentPage,
    totalPages,
    hasPrevious,
    hasNext,
    tabItems,
    getTabQuery,
    getPageQuery,
    onTournamentFilterChange,
    clearFilters,
  };
}
