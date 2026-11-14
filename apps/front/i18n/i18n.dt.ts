import "vue-i18n";
import type fr from "./locales/fr-FR.json";

type MainTranslations = typeof fr;

declare module "vue-i18n" {
  // The merge needs an interface; the redeclared member keeps the body non-empty.
  export interface DefineLocaleMessage extends MainTranslations {
    common: MainTranslations["common"];
  }
}
