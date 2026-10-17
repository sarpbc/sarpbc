import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import en from "../../i18n/locales/en-US.json";
import fr from "../../i18n/locales/fr-FR.json";

describe("translated SEO titles", () => {
  for (const locale of ["en", "fr"] as const) {
    it(`keeps the site name in ${locale} titles instead of treating it as a plural form`, () => {
      const i18n = createI18n({ legacy: false, locale, messages: { en, fr } });
      const titles = [
        i18n.global.t("page.home.seo.title"),
        i18n.global.t("page.news.seoTitle", { title: "RLCS finals" }),
        i18n.global.t("page.tournaments.id.seoTitle", { tournamentName: "RLCS Boston" }),
      ];
      for (const title of titles) {
        expect(title).toContain(" | sarpbc.org");
      }
    });
  }
});
