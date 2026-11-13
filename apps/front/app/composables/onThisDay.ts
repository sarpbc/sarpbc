import type { OnThisDay } from "@sarpbc/types";

export async function getOnThisDay(): Promise<OnThisDay> {
  return apiFetch<OnThisDay>("/on-this-day", { method: "GET" });
}

export function useOnThisDay() {
  const { data, pending, error, refresh } = useLazyAsyncData("on-this-day", () => getOnThisDay());

  const events = computed(() => data.value?.events ?? []);
  const date = computed(() => data.value?.date ?? null);

  return { events, date, pending, error, refresh };
}
