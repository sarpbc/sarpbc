import type { SupportedLocale } from "@sarpbc/types";

export type NewsTranslationFields = {
  titleFr: string | null;
  contentFr: string | null;
};

export type NewsLocalizableFields = {
  title: string;
  content: string;
} & NewsTranslationFields;

export type LocalizedNewsFields = {
  title: string;
  content: string;
};

export function hasFrenchTranslation(
  article: NewsTranslationFields,
): article is { titleFr: string; contentFr: string } {
  return Boolean(article.titleFr?.trim() && article.contentFr?.trim());
}

export function localizedNewsFields(
  article: NewsLocalizableFields,
  locale: SupportedLocale,
): LocalizedNewsFields {
  if (locale === "fr-FR" && hasFrenchTranslation(article)) {
    return { title: article.titleFr, content: article.contentFr };
  }
  return { title: article.title, content: article.content };
}
