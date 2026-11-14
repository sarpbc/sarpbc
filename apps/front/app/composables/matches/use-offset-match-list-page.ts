import { isNonEmptyString } from "@sarpbc/utils";

export interface OffsetPageQuery {
  offset?: string;
  [key: string]: string | undefined;
}

export const MATCH_LIST_PAGE_SIZE = 20;

export const parseRouteOffset = (value: string | null | (string | null)[] | undefined): number => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!isNonEmptyString(raw)) {
    return 0;
  }

  const parsed = Math.trunc(Number(raw));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

export const offsetPageQuery = (offset: number): OffsetPageQuery => {
  if (offset <= 0) {
    return {};
  }

  return { offset: String(offset) };
};

const getPageQuery = (nextOffset: number): OffsetPageQuery =>
  offsetPageQuery(Math.max(0, nextOffset));

export const useOffsetMatchListPage = <TData extends { total: number }>(config: {
  keyPrefix: string;
  fetch: (query: { limit: number; offset: number }) => Promise<TData>;
}) => {
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
};
