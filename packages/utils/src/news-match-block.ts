export const NEWS_MATCH_BLOCK_MAX_MATCHES = 10;
export const NEWS_MATCH_BLOCK_DEFAULT_LIMIT = 5;

export type NewsMatchBlock =
  | { kind: "match"; id: string }
  | { kind: "matches"; ids: string[] }
  | { kind: "tournament"; id: string; limit: number }
  | { kind: "team"; id: string; limit: number };

export type NewsMatchBlockKind = NewsMatchBlock["kind"];

export interface NewsMatchBlockAttrs {
  match?: string | null;
  ids?: string | null;
  tournament?: string | null;
  team?: string | null;
  limit?: string | number | null;
}

export interface NewsMatchTag {
  block: NewsMatchBlock;
  raw: string;
}

const MATCH_TAG_SOURCE = String.raw`::matches\{([^}]*)\}[ \t]*\n?[ \t]*::|::?matches\{([^}]*)\}`;
const MATCH_TAG_PATTERN = new RegExp(`^(?:${MATCH_TAG_SOURCE})`);
const MATCH_TAG_GLOBAL_PATTERN = new RegExp(MATCH_TAG_SOURCE, "g");
const ATTR_PATTERN = /(\w+)="((?:\\.|[^"\\])*)"/g;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECTORS = ["match", "ids", "tournament", "team"] as const;
const ATTR_NAMES = new Set<string>([...SELECTORS, "limit"]);

function unescapeAttrValue(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function parseLimit(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return NEWS_MATCH_BLOCK_DEFAULT_LIMIT;
  }
  const limit = Number(String(value).trim());
  return Number.isInteger(limit) && limit >= 1 && limit <= NEWS_MATCH_BLOCK_MAX_MATCHES
    ? limit
    : null;
}

function parseIds(value: string): string[] | null {
  const ids = value
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > NEWS_MATCH_BLOCK_MAX_MATCHES || !ids.every(isUuid)) {
    return null;
  }
  return new Set(ids).size === ids.length ? ids : null;
}

export function newsMatchBlockFromAttrs(attrs: NewsMatchBlockAttrs): NewsMatchBlock | null {
  const present = SELECTORS.filter((name) => {
    const value = attrs[name];
    return value != null && value.trim() !== "";
  });
  if (present.length !== 1) {
    return null;
  }

  const selector = present[0]!;
  const value = attrs[selector]!.trim();
  const hasLimit = attrs.limit != null && attrs.limit !== "";

  switch (selector) {
    case "match":
      return !hasLimit && isUuid(value) ? { kind: "match", id: value.toLowerCase() } : null;
    case "ids": {
      const ids = hasLimit ? null : parseIds(value);
      return ids ? { kind: "matches", ids } : null;
    }
    case "tournament":
    case "team": {
      const limit = parseLimit(attrs.limit);
      return limit !== null && isUuid(value)
        ? { kind: selector, id: value.toLowerCase(), limit }
        : null;
    }
    default: {
      const exhaustive: never = selector;
      return exhaustive;
    }
  }
}

export function newsMatchBlockToAttrs(block: NewsMatchBlock): NewsMatchBlockAttrs {
  switch (block.kind) {
    case "match":
      return { match: block.id };
    case "matches":
      return { ids: block.ids.join(",") };
    case "tournament":
      return { tournament: block.id, limit: String(block.limit) };
    case "team":
      return { team: block.id, limit: String(block.limit) };
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

export function parseNewsMatchTag(raw: string): NewsMatchTag | null {
  const match = raw.match(MATCH_TAG_PATTERN);
  if (!match) {
    return null;
  }

  const attrs: Record<string, string> = {};
  for (const attr of (match[1] ?? match[2] ?? "").matchAll(ATTR_PATTERN)) {
    if (attr[1] != null && attr[2] != null) {
      attrs[attr[1]] = unescapeAttrValue(attr[2]);
    }
  }
  if (Object.keys(attrs).some((name) => !ATTR_NAMES.has(name))) {
    return null;
  }

  const block = newsMatchBlockFromAttrs(attrs);
  return block ? { block, raw: match[0] } : null;
}

export function serializeNewsMatchTag(block: NewsMatchBlock): string {
  const attrs = Object.entries(newsMatchBlockToAttrs(block))
    .filter(([, value]) => value != null)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
  return `:matches{${attrs}}`;
}

export function newsMatchBlockKey(block: NewsMatchBlock): string {
  switch (block.kind) {
    case "match":
      return `match:${block.id}`;
    case "matches":
      return `matches:${block.ids.join(",")}`;
    case "tournament":
      return `tournament:${block.id}:${block.limit}`;
    case "team":
      return `team:${block.id}:${block.limit}`;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

export function parseNewsMatchBlockKey(key: string): NewsMatchBlock | null {
  const [kind, value, limit, ...rest] = key.split(":");
  if (rest.length > 0 || value == null) {
    return null;
  }

  let block: NewsMatchBlock | null;
  switch (kind) {
    case "match":
      block = limit === undefined ? newsMatchBlockFromAttrs({ match: value }) : null;
      break;
    case "matches":
      block = limit === undefined ? newsMatchBlockFromAttrs({ ids: value }) : null;
      break;
    case "tournament":
    case "team":
      block = limit === undefined ? null : newsMatchBlockFromAttrs({ [kind]: value, limit });
      break;
    default:
      return null;
  }
  return block && newsMatchBlockKey(block) === key ? block : null;
}

export function extractNewsMatchBlocks(content: string): NewsMatchBlock[] {
  const blocks = new Map<string, NewsMatchBlock>();
  for (const match of content.matchAll(MATCH_TAG_GLOBAL_PATTERN)) {
    const parsed = parseNewsMatchTag(match[0]);
    if (parsed) {
      blocks.set(newsMatchBlockKey(parsed.block), parsed.block);
    }
  }
  return [...blocks.values()];
}

export function findInvalidNewsMatchTags(content: string): string[] {
  return [...content.matchAll(MATCH_TAG_GLOBAL_PATTERN)]
    .map((match) => match[0])
    .filter((raw) => !parseNewsMatchTag(raw));
}

export function stripNewsMatchTags(content: string): string {
  return content.replace(MATCH_TAG_GLOBAL_PATTERN, " ");
}
