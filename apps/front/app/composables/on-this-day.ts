import type { OnThisDay } from "@sarpbc/types";

export const getOnThisDay = async (): Promise<OnThisDay> =>
  await apiFetch<OnThisDay>("/on-this-day", { method: "GET" });

export const useOnThisDay = () => {
  const { data, pending, error, refresh } = useLazyAsyncData(
    "on-this-day",
    async () => await getOnThisDay(),
  );

  const events = computed(() => data.value?.events ?? []);
  const date = computed(() => data.value?.date ?? null);

  return { events, date, pending, error, refresh };
};
