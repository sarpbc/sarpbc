import type { MaybeRef } from "vue";
import type { Transfer } from "~/types/transfer";
import { apiFetch } from "~/utils/apiFetch";

export interface TransferQuery {
  team?: string;
  limit: number;
  offset?: number;
}

export async function getTransfers(
  query: TransferQuery,
): Promise<{ transfers: Transfer[]; total: number }> {
  const res = await apiFetch<{ transfers?: Transfer[]; count?: number }>(`/transfers`, {
    method: "GET",
    params: query,
  });
  const transfers = res.transfers ?? [];
  return { transfers, total: res.count ?? transfers.length };
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
