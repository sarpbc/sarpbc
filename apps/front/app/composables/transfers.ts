import type { MaybeRef } from "vue";
import type { Transfer, TransferType } from "~/types/transfer";

export const TRANSFER_PERIODS = ["all", "30d", "90d", "1y"] as const;
export type TransferPeriod = (typeof TRANSFER_PERIODS)[number];

export type TransferFilterKind = "team" | "player";

export interface TransferFilterOption {
  label: string;
  value: string;
}

export interface TransferQuery {
  team?: string;
  player?: string;
  type?: TransferType;
  from?: string;
  limit: number;
  offset?: number;
}

export async function getTransfers(
  query: TransferQuery,
): Promise<{ transfers: Transfer[]; total: number }> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ transfers?: Transfer[]; count?: number }>(
    `${config.public.apiBase}/transfers`,
    {
      method: "GET",
      credentials: "include",
      params: query,
    },
  );
  const transfers = res.transfers ?? [];
  return { transfers, total: res.count ?? transfers.length };
}

function daysBack(days: number, now: Date): string {
  const day = new Date(now);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

export function transferPeriodStart(period: TransferPeriod, now: Date): string | undefined {
  switch (period) {
    case "all":
      return undefined;
    case "30d":
      return daysBack(30, now);
    case "90d":
      return daysBack(90, now);
    case "1y":
      return daysBack(365, now);
    default: {
      const exhaustive: never = period;
      return exhaustive;
    }
  }
}

export async function searchTransferFilterOptions(
  kind: TransferFilterKind,
  name: string,
): Promise<TransferFilterOption[]> {
  const config = useRuntimeConfig();
  const params = { limit: 10, name: name || undefined };
  switch (kind) {
    case "team": {
      const res = await $fetch<{ teams?: { name: string; slug: string }[] }>(
        `${config.public.apiBase}/team`,
        { method: "GET", credentials: "include", params },
      );
      return (res.teams ?? []).map(({ name, slug }) => ({ label: name, value: slug }));
    }
    case "player": {
      const res = await $fetch<{ players?: { name: string; slug: string }[] }>(
        `${config.public.apiBase}/player`,
        { method: "GET", credentials: "include", params },
      );
      return (res.players ?? []).map(({ name, slug }) => ({ label: name, value: slug }));
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export async function getTransferFilterOption(
  kind: TransferFilterKind,
  slug: string,
): Promise<TransferFilterOption | null> {
  const config = useRuntimeConfig();
  const res = await $fetch<{
    team?: { name: string; slug: string } | null;
    player?: { name: string; slug: string } | null;
  }>(`${config.public.apiBase}/${kind}/slug/${encodeURIComponent(slug)}`, {
    method: "GET",
    credentials: "include",
  });
  const entity = res[kind];
  return entity ? { label: entity.name, value: entity.slug } : null;
}

export function useLatestTransfers(team: MaybeRef<string | undefined>, limit = 5) {
  const teamRef = toRef(team);

  const { data, pending, error, refresh } = useLazyAsyncData(
    () => `latest-transfers-${teamRef.value ?? "all"}-${limit}`,
    () => getTransfers({ team: teamRef.value, limit }),
    {
      watch: [teamRef],
      default: () => ({ transfers: [], total: 0 }),
    },
  );

  const transfers = computed(() => data.value?.transfers ?? []);

  return { transfers, pending, error, refresh };
}
