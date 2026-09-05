import type { ParsedTweetUrl, TweetEmbed } from "@sarpbc/utils";

const OEMBED_BODY_PATTERN = /<p\b[^>]*>([\s\S]*?)<\/p>/i;
const OEMBED_DATE_PATTERN =
  /<a\b[^>]*href="[^"]*\/status\/\d+[^"]*"[^>]*>([^<]+)<\/a>\s*<\/blockquote>/i;

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
} as const;

function namedHtmlEntity(entity: string): string | undefined {
  const key = entity.toLowerCase();
  switch (key) {
    case "amp":
    case "lt":
    case "gt":
    case "quot":
    case "apos":
    case "nbsp":
    case "mdash":
    case "ndash":
      return HTML_ENTITIES[key];
    default:
      return undefined;
  }
}

export interface TweetOEmbedResponse {
  author_name?: string;
  author_url?: string;
  html?: string;
}

export function handleFromAuthorUrl(authorUrl: string | undefined): string {
  if (!authorUrl) {
    return "";
  }

  try {
    const path = new URL(authorUrl).pathname.replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    const handle = segments[segments.length - 1];
    return handle?.replace(/^@/, "") ?? "";
  } catch {
    return "";
  }
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const named = namedHtmlEntity(entity);
    if (named) {
      return named;
    }

    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return match;
  });
}

export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tweetEmbedFromOEmbed(
  parsed: ParsedTweetUrl,
  oembed: TweetOEmbedResponse,
): TweetEmbed | null {
  const html = oembed.html?.trim();
  if (!html) {
    return null;
  }

  const bodyHtml = html.match(OEMBED_BODY_PATTERN)?.[1] ?? html;
  const text = htmlToPlainText(bodyHtml);
  if (!text) {
    return null;
  }

  const authorHandle = handleFromAuthorUrl(oembed.author_url) || parsed.handle || "";
  const authorName = oembed.author_name?.trim() || authorHandle;
  const authorUrl =
    oembed.author_url?.trim() || (authorHandle ? `https://x.com/${authorHandle}` : parsed.url);
  const postedAtLabel = html.match(OEMBED_DATE_PATTERN)?.[1]?.trim() || null;

  return {
    id: parsed.id,
    url: parsed.url,
    authorName,
    authorHandle,
    authorUrl: authorUrl.replace("https://twitter.com/", "https://x.com/"),
    text,
    postedAtLabel,
  };
}
