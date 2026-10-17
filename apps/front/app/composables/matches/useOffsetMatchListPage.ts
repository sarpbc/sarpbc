export type OffsetPageQuery = {
  offset?: string;
  type?: string;
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

export function useOffsetMatchListPage<TData extends { total: number }>(config: {
  keyPrefix: string;
  fetch: (query: { limit: number; offset: number }) => Promise<TData>;
}) {
  const route = useRoute();
  const offset = computed(() => parseRouteOffset(route.query.offset));
  const listQuery = computed(() => ({
    limit: MATCH_LIST_PAGE_SIZE,
    offset: offset.value,
  }));

  const {
    data: response,
    pending,
    error,
    refresh,
  } = useLazyAsyncData(
    () => `${config.keyPrefix}-${offset.value}`,
    async () => ({ data: await config.fetch(listQuery.value) }),
    {
      watch: [offset],
      default: () => null,
    },
  );

  const data = computed(() => response.value?.data ?? null);
  const totalMatches = computed(() => data.value?.total ?? 0);
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
