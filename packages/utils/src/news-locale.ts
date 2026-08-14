export const NEWS_LOCALE_QUERY = ["en", "en-US", "fr", "fr-FR"] as const;

export type NewsLocaleQuery = (typeof NEWS_LOCALE_QUERY)[number];
export type NewsLocale = "en-US" | "fr-FR";

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

export function parseNewsLocale(raw?: string | null): NewsLocale {
  if (raw === "fr" || raw === "fr-FR") {
    return "fr-FR";
  }
  return "en-US";
}

export function hasFrenchTranslation(
  article: NewsTranslationFields,
): article is { titleFr: string; contentFr: string } {
  return Boolean(article.titleFr?.trim() && article.contentFr?.trim());
}

export function localizedNewsFields(
  article: NewsLocalizableFields,
  locale: NewsLocale,
): LocalizedNewsFields {
  if (locale === "fr-FR" && hasFrenchTranslation(article)) {
    return { title: article.titleFr, content: article.contentFr };
  }
  return { title: article.title, content: article.content };
}
