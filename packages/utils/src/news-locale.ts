import type { SupportedLocale } from "@sarpbc/types";
import { isNonEmptyString } from "./text";

export interface NewsTranslationFields {
  titleFr: string | null;
  contentFr: string | null;
}

export type NewsLocalizableFields = {
  title: string;
  content: string;
} & NewsTranslationFields;

export interface LocalizedNewsFields {
  title: string;
  content: string;
}

export const hasFrenchTranslation = (
  article: NewsTranslationFields,
): article is { titleFr: string; contentFr: string } =>
  isNonEmptyString(article.titleFr?.trim()) && isNonEmptyString(article.contentFr?.trim());

export const localizedNewsFields = (
  article: NewsLocalizableFields,
  locale: SupportedLocale,
): LocalizedNewsFields => {
  if (locale === "fr-FR" && hasFrenchTranslation(article)) {
    return { title: article.titleFr, content: article.contentFr };
  }

  return { title: article.title, content: article.content };
};
