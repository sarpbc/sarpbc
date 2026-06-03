import { formatPrizepool, createCurrencyFormatter } from "~/utils/currencyFormatter";

export const useCurrency = () => {
  const { locale } = useI18n();

  const formatTournamentPrizepool = (prizepool: string | undefined | null): string => {
    if (!prizepool) return "";

    const formatter = createCurrencyFormatter(locale.value);
    return formatter.format(prizepool);
  };

  return {
    formatTournamentPrizepool,
    formatPrizepool,
  };
};
