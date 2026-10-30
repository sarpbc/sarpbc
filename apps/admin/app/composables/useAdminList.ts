import type { Ref } from "vue";

export type AdminListPage<T> = { items: T[]; total: number };

export function useAdminList<T>(
  key: string,
  fetchPage: (range: { limit: number; offset: number }) => Promise<AdminListPage<T>>,
  limit = 25,
) {
  const page = ref(1);
  const items = ref([]) as Ref<T[]>;
  const total = ref(0);

  const { status, data, refresh } = useLazyAsyncData(
    () => `${key}-${page.value}`,
    () => fetchPage({ limit, offset: (page.value - 1) * limit }),
    { watch: [page], server: false },
  );

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

  return { items, total, page, limit, status, refresh };
}
