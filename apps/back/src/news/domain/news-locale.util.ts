export type NewsLocale = "en-US" | "fr-FR";

export function parseNewsLocale(raw?: string | null): NewsLocale {
  if (!raw) {
    return "en-US";
  }
  return raw.trim().toLowerCase().startsWith("fr") ? "fr-FR" : "en-US";
}

export function hasFrenchTranslation(article: {
  titleFr: string | null;
  contentFr: string | null;
}): boolean {
  return Boolean(article.titleFr?.trim() && article.contentFr?.trim());
}

export type LocalizedNewsFields = {
  title: string;
  content: string;
};

export function localizedNewsFields(
  article: {
    title: string;
    content: string;
    titleFr: string | null;
    contentFr: string | null;
  },
  locale: NewsLocale,
): LocalizedNewsFields {
  switch (locale) {
    case "fr-FR": {
      if (hasFrenchTranslation(article) && article.titleFr && article.contentFr) {
        return {
          title: article.titleFr,
          content: article.contentFr,
        };
      }
      return { title: article.title, content: article.content };
    }
    case "en-US":
      return { title: article.title, content: article.content };
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
