import "vue-i18n";
import type career from "./career/fr-FR.json";
import type fr from "./locales/fr-FR.json";

type MainTranslations = typeof fr & typeof career;

declare module "vue-i18n" {
  // WARNING: the merge needs an interface; the redeclared member keeps the body non-empty.
  export interface DefineLocaleMessage extends MainTranslations {
    common: MainTranslations["common"];
  }
}
