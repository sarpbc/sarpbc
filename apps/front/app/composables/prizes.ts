import type { PrizeAmount, TournamentPrizes } from "@sarpbc/types";
import { formatPrizeAmount } from "~/utils/currencyFormatter";
import { apiFetch } from "~/utils/apiFetch";

export const STARTGG_URL = "https://www.start.gg";

export async function getTournamentPrizes(tournamentId: string): Promise<TournamentPrizes> {
  return apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });
}

export function usePrizeFormat() {
  const { t, locale } = useI18n();

  const ordinalRules = computed(() => new Intl.PluralRules(locale.value, { type: "ordinal" }));

  function formatAmount(amount: number, currency: string): string {
    return formatPrizeAmount(amount, currency, locale.value);
  }

  function formatTotals(totals: PrizeAmount[]): string {
    return totals.map(({ amount, currency }) => formatAmount(amount, currency)).join(" · ");
  }

  function formatPlacement(placement: number): string {
    return t(`common.placement.${ordinalRules.value.select(placement)}`, { n: placement });
  }

  return { formatAmount, formatTotals, formatPlacement };
}
