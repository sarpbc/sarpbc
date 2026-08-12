export type OffsetPageQuery = {
  offset?: string;
};

export const MATCH_LIST_PAGE_SIZE = 20;

export function parseRouteOffset(value: string | null | (string | null)[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function offsetPageQuery(offset: number): OffsetPageQuery {
  if (offset <= 0) {
    return {};
  }
  return { offset: String(offset) };
}

export function useOffsetMatchListPage<TData>(config: {
  keyPrefix: string;
  fetch: (query: { limit: number; offset: number }) => Promise<TData>;
  total: (data: TData | null) => number;
}) {
  const route = useRoute();
  const offset = computed(() => parseRouteOffset(route.query.offset));
  const listQuery = computed(() => ({
    limit: MATCH_LIST_PAGE_SIZE,
    offset: offset.value,
  }));

  const { data, pending, error, refresh } = useLazyAsyncData<TData | null>(
    () => `${config.keyPrefix}-${offset.value}`,
    () => config.fetch(listQuery.value),
    {
      watch: [offset],
      default: () => null,
    },
  );

  const totalMatches = computed(() => config.total(data.value));
  const currentPage = computed(() => Math.floor(offset.value / MATCH_LIST_PAGE_SIZE) + 1);
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalMatches.value / MATCH_LIST_PAGE_SIZE)),
  );
  const hasPrevious = computed(() => offset.value > 0);
  const hasNext = computed(() => offset.value + MATCH_LIST_PAGE_SIZE < totalMatches.value);

  function getPageQuery(nextOffset: number): OffsetPageQuery {
    return offsetPageQuery(Math.max(0, nextOffset));
  }

  return {
    offset,
    pending,
    error,
    refresh,
    data,
    totalMatches,
    currentPage,
    totalPages,
    hasPrevious,
    hasNext,
    getPageQuery,
  };
}
