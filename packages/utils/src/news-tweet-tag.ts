import { escapeNewsTagAttrValue, parseNewsTagAttrs } from "./news-tag-attrs";
import { isNonEmptyString } from "./text";

export interface ParsedTweetUrl {
  id: string;
  handle: string | null;
  url: string;
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
  authorImageUrl: string | null;
  text: string;
  postedAt: string;
  media: {
    type: "photo" | "video" | "animated_gif";
    url: string;
    width: number;
    height: number;
    alt: string;
  }[];
}

const TWEET_STATUS_PATTERN =
  /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/(?:i\/(?:web\/)?status|(?<handle>[A-Za-z0-9_]{1,15})\/status)\/(?<id>\d+)/i;

const TWEET_TAG_PATTERN = /^(?::{1,2})tweet\{(?<attrs>[^}]*)\}(?:\s*\n?::)?/;
const WHITESPACE = /\s/;

const TWEET_BLOCK_OPENER = "::tweet{";
const TWEET_INLINE_OPENER = ":tweet{";

export function parseTweetUrl(input: string): ParsedTweetUrl | null {
  const trimmed = input.trim();
  const match = TWEET_STATUS_PATTERN.exec(trimmed);

  const { handle: matchedHandle, id } = match?.groups ?? {};

  if (id === undefined) {
    return null;
  }

  const handle = matchedHandle || null;
  const pathHandle = handle ?? "i/web";

  return {
    id,
    handle,
    url: `https://x.com/${pathHandle}/status/${id}`,
  };
}

export function parseNewsTweetTag(raw: string): NewsTweetTag | null {
  const match = TWEET_TAG_PATTERN.exec(raw);

  if (!match) {
    return null;
  }

  const url = parseNewsTagAttrs(match[1] ?? "")
    .find((attr) => attr.name === "url")
    ?.value.trim();

  if (!isNonEmptyString(url)) {
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

  return `:tweet{url="${escapeNewsTagAttrValue(canonical)}"}`;
}

export function newsTweetTagStart(content: string): number {
  const block = content.indexOf(TWEET_BLOCK_OPENER);

  return block === -1 ? content.indexOf(TWEET_INLINE_OPENER) : block;
}

function blockTagEnd(content: string, afterBrace: number): number {
  let index = afterBrace;

  while (index < content.length && WHITESPACE.test(content.charAt(index))) {
    index += 1;
  }

  return content.startsWith("::", index) ? index + 2 : -1;
}

function replaceTweetTags(
  content: string,
  opener: string,
  tagEnd: (afterBrace: number) => number,
): string {
  let result = "";
  let copiedUntil = 0;
  let searchFrom = 0;

  while (true) {
    const start = content.indexOf(opener, searchFrom);

    if (start === -1) {
      break;
    }

    const closingBrace = content.indexOf("}", start + opener.length);

    if (closingBrace === -1) {
      break;
    }

    const end = tagEnd(closingBrace + 1);

    if (end === -1) {
      searchFrom = closingBrace + 1;
      continue;
    }

    result += `${content.slice(copiedUntil, start)} `;
    copiedUntil = end;
    searchFrom = end;
  }

  return result + content.slice(copiedUntil);
}

export function stripNewsTweetTags(content: string): string {
  return replaceTweetTags(
    replaceTweetTags(content, TWEET_BLOCK_OPENER, (afterBrace) => blockTagEnd(content, afterBrace)),
    TWEET_INLINE_OPENER,
    (afterBrace) => afterBrace,
  );
}

export function isTweetImageUrl(input: string): boolean {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.hostname === "pbs.twimg.com" &&
    url.port === "" &&
    url.username === "" &&
    url.password === ""
  );
}

export function tweetImageProxyPath(url: string): string | null {
  return isTweetImageUrl(url) ? `/news/embed/tweet/image?url=${encodeURIComponent(url)}` : null;
}
