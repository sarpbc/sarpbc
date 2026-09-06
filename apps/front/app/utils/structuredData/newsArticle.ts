import { excerptFromNewsContent, NEWS_SEO_DESCRIPTION_MAX_LENGTH } from "@sarpbc/utils";
import { SITE_ORIGIN } from "~/utils/calendar/ics";
import { compactJsonLd, SCHEMA_ORG, type JsonLdNode } from "./jsonLd";
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
  origin?: string;
}

export function newsArticleCanonicalUrl(slug: string, origin = SITE_ORIGIN): string {
  return `${origin}/news/${slug}`;
}

export function buildNewsArticleJsonLd(article: BuildNewsArticleJsonLdInput): NewsArticleLd {
  const origin = article.origin ?? SITE_ORIGIN;
  const url = newsArticleCanonicalUrl(article.slug, origin);
  const description =
    excerptFromNewsContent(article.content, NEWS_SEO_DESCRIPTION_MAX_LENGTH) || undefined;
  const authorName = article.author?.trim();
  const image = article.imageUrl?.trim() || undefined;

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.createdAt,
    url,
    description,
    image,
    author: authorName
      ? compactJsonLd({
          "@type": "Person",
          name: authorName,
        })
      : undefined,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  });
}
