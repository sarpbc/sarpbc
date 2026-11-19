export const useCurrency = () => {
  const { locale } = useI18n();

  const formatTournamentPrizepool = (prizepool: string | undefined | null) =>
    formatPrizepool(prizepool, locale.value);

  return {
    formatTournamentPrizepool,
  };
};
