import type { PrizeAmount, TournamentPrizes } from "@sarpbc/types";
import { formatPrizeAmount } from "~/utils/currency-formatter";

export const STARTGG_URL = "https://www.start.gg";

export const getTournamentPrizes = async (tournamentId: string): Promise<TournamentPrizes> =>
  await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });

export const usePrizeFormat = () => {
  const { t, locale } = useI18n();

  const ordinalRules = computed(() => new Intl.PluralRules(locale.value, { type: "ordinal" }));

  const formatAmount = (amount: number, currency: string): string =>
    formatPrizeAmount(amount, currency, locale.value);

  const formatTotals = (totals: PrizeAmount[]): string =>
    totals.map(({ amount, currency }) => formatAmount(amount, currency)).join(" · ");

  const formatPlacement = (placement: number): string =>
    t(`common.placement.${ordinalRules.value.select(placement)}`, { n: placement });

  return { formatAmount, formatTotals, formatPlacement };
};
