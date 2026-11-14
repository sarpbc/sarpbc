import {
  excerptFromNewsContent,
  localizedPath,
  newsPath,
  NEWS_SEO_DESCRIPTION_MAX_LENGTH,
  isNonEmptyString,
} from "@sarpbc/utils";
import type { UiLocale } from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";
import { compactJsonLd, SCHEMA_ORG } from "./json-ld";
import type { JsonLdNode } from "./json-ld";
import { ORGANIZATION_ID } from "./organization";

export interface NewsArticleLd extends JsonLdNode {
  "@type": "NewsArticle";
  headline: string;
  datePublished: string;
  url: string;
  description?: string;
  image?: string;
  author?: { "@type": "Person"; name: string };
  publisher: { "@id": string };
}

export interface BuildNewsArticleJsonLdInput {
  title: string;
  slug: string;
  createdAt: string;
  content: string;
  author?: string;
  imageUrl?: string | null;
  locale?: UiLocale;
}

export function buildNewsArticleJsonLd(article: BuildNewsArticleJsonLdInput): NewsArticleLd {
  const url = `${SITE_ORIGIN}${localizedPath(newsPath(article.slug), article.locale ?? "en")}`;

  const description =
    excerptFromNewsContent(article.content, NEWS_SEO_DESCRIPTION_MAX_LENGTH) || undefined;

  const authorName = article.author?.trim();
  const trimmedImage = article.imageUrl?.trim();
  const image = isNonEmptyString(trimmedImage) ? trimmedImage : undefined;

  return compactJsonLd<NewsArticleLd>({
    "@context": SCHEMA_ORG,
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.createdAt,
    url,
    description,
    image,
    author: isNonEmptyString(authorName)
      ? {
          "@type": "Person",
          name: authorName,
        }
      : undefined,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  });
}
