import type { PlayerAwardType, SeasonAwardType } from "@sarpbc/types";

export function usePlayerAwardLabels() {
  const { t } = useI18n();

  function awardTypeLabel(awardType: PlayerAwardType): string {
    switch (awardType) {
      case "mvp":
        return t("page.player.slug.awards.types.mvp");
      case "grand_finals_mvp":
        return t("page.player.slug.awards.types.grand_finals_mvp");
      case "offensive_mvp":
        return t("page.player.slug.awards.types.offensive_mvp");
      case "defensive_mvp":
        return t("page.player.slug.awards.types.defensive_mvp");
      case "breakthrough_player":
        return t("page.player.slug.awards.types.breakthrough_player");
      default: {
        const _exhaustive: never = awardType;
        return _exhaustive;
      }
    }
  }

  function seasonAwardTypeLabel(awardType: SeasonAwardType): string {
    switch (awardType) {
      case "season_mvp":
        return t("page.player.slug.awards.seasonTypes.season_mvp");
      case "regular_season_mvp":
        return t("page.player.slug.awards.seasonTypes.regular_season_mvp");
      case "regional_mvp":
        return t("page.player.slug.awards.seasonTypes.regional_mvp");
      default: {
        const _exhaustive: never = awardType;
        return _exhaustive;
      }
    }
  }

  return { awardTypeLabel, seasonAwardTypeLabel };
}
