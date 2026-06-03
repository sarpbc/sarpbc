import "vue-i18n";
import type fr from "./locales/fr-FR.json";

type MainTranslations = typeof fr;
declare module "vue-i18n" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MainTranslations {}
}
