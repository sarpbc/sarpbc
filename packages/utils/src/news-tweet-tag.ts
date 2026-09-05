export interface ParsedTweetUrl {
  id: string;
  handle: string | null;
  url: string;
  oembedUrl: string;
}

export interface NewsTweetTag {
  url: string;
  parsed: ParsedTweetUrl;
  raw: string;
}

export interface TweetEmbed {
  id: string;
  url: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  text: string;
  postedAtLabel: string | null;
}

const TWEET_STATUS_PATTERN =
  /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/(?:i\/(?:web\/)?status|([A-Za-z0-9_]{1,15})\/status)\/(\d+)/i;

const TWEET_TAG_PATTERN = /^(?::{1,2})tweet\{([^}]*)\}(?:\s*\n?::)?/;
const ATTR_PATTERN = /(\w+)="((?:\\.|[^"\\])*)"/g;

function unescapeAttrValue(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function parseTweetUrl(input: string): ParsedTweetUrl | null {
  const trimmed = input.trim();
  const match = trimmed.match(TWEET_STATUS_PATTERN);
  if (!match || match[2] == null) {
    return null;
  }

  const handle = match[1] ? match[1] : null;
  const id = match[2];
  const pathHandle = handle ?? "i/web";

  return {
    id,
    handle,
    url: `https://x.com/${pathHandle}/status/${id}`,
    oembedUrl: `https://twitter.com/${pathHandle}/status/${id}`,
  };
}

export function parseNewsTweetTag(raw: string): NewsTweetTag | null {
  const match = raw.match(TWEET_TAG_PATTERN);
  if (!match) {
    return null;
  }

  let url: string | undefined;
  for (const attr of (match[1] ?? "").matchAll(ATTR_PATTERN)) {
    if (attr[1] === "url" && attr[2] != null) {
      url = unescapeAttrValue(attr[2]).trim();
      break;
    }
  }

  if (!url) {
    return null;
  }

  const parsed = parseTweetUrl(url);
  if (!parsed) {
    return null;
  }

  return {
    url: parsed.url,
    parsed,
    raw: match[0],
  };
}

export function serializeNewsTweetTag(url: string): string {
  const parsed = parseTweetUrl(url);
  const canonical = parsed?.url ?? url.trim();
  return `:tweet{url="${escapeAttrValue(canonical)}"}`;
}

export function stripNewsTweetTags(content: string): string {
  return content.replace(/::tweet\{[^}]*\}\s*\n?::/g, " ").replace(/:tweet\{[^}]*\}/g, " ");
}
