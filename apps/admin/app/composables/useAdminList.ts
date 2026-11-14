type AdminListRange = { limit: number; offset: number; search: string };

type AdminListPage<T> = { items: T[]; total: number };

export function useAdminList<T>(
  key: string,
  fetchPage: (range: AdminListRange) => Promise<AdminListPage<T>>,
) {
  const limit = 25;
  const page = ref(1);
  const search = ref("");
  const items = shallowRef<T[]>([]);
  const total = ref(0);

  const { status, data, error, refresh } = useLazyAsyncData(
    () => `${key}-${search.value}-${page.value}`,
    async () => await fetchPage({ limit, offset: (page.value - 1) * limit, search: search.value }),
    { watch: [page, search], server: false },
  );

  watch(search, () => {
    page.value = 1;
  });

  watch(
    status,
    (s) => {
      if (s === "success" && data.value) {
        items.value = data.value.items;
        total.value = data.value.total;
      }
    },
    { immediate: true },
  );

  return { items, total, page, search, limit, status, error, refresh };
}
