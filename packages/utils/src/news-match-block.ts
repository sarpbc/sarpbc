import type { MatchBlockSelector } from "@sarpbc/types";
import { UUID_PATTERN } from "./entity-slug";

export const NEWS_MATCH_BLOCK_MAX_MATCHES = 10;
export const NEWS_MATCH_BLOCK_DEFAULT_LIMIT = 5;
export const NEWS_MATCH_BLOCKS_PER_REQUEST = 20;

export type NewsMatchBlockKind = MatchBlockSelector["kind"];

export interface NewsMatchBlockAttrs {
  match?: string | null;
  ids?: string | null;
  tournament?: string | null;
  team?: string | null;
  limit?: string | number | null;
}

export interface NewsMatchTag {
  block: MatchBlockSelector;
  raw: string;
}

const MATCH_TAG_SOURCE = String.raw`::matches\{([^{}]*)\}[ \t]*\r?\n::|::?matches\{([^{}]*)\}`;
const MATCH_TAG_PATTERN = new RegExp(`^(?:${MATCH_TAG_SOURCE})`);
const MATCH_TAG_GLOBAL_PATTERN = new RegExp(MATCH_TAG_SOURCE, "g");
const MATCH_BLOCK_OPENER = "::matches{";
const MATCH_INLINE_OPENER = ":matches{";
const ATTRS_PATTERN = /^(?:\w+="[^"]*"(?:[ \t]+\w+="[^"]*")*)?$/;
const LIMIT_PATTERN = /^[1-9]\d*$/;
const BACKTICK_RUN_PATTERN = /`+/g;
const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const MAX_TAG_INDENT = 3;
const SELECTORS = ["match", "ids", "tournament", "team"] as const;
const ATTR_NAMES = new Set<string>([...SELECTORS, "limit"]);

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function parseLimit(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return NEWS_MATCH_BLOCK_DEFAULT_LIMIT;
  }

  const text = String(value).trim();

  if (!LIMIT_PATTERN.test(text)) {
    return null;
  }

  const limit = Number(text);

  return limit <= NEWS_MATCH_BLOCK_MAX_MATCHES ? limit : null;
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

function parseAttrs(inner: string): Record<string, string> | null {
  const source = inner.trim();

  if (!ATTRS_PATTERN.test(source)) {
    return null;
  }

  const parts = source.split('"');
  const attrs: Record<string, string> = {};

  for (let index = 0; index + 1 < parts.length; index += 2) {
    const name = parts[index]?.trim().slice(0, -1) ?? "";
    const value = parts[index + 1] ?? "";

    if (!ATTR_NAMES.has(name) || name in attrs) {
      return null;
    }

    attrs[name] = value;
  }

  return attrs;
}

export function newsMatchBlockFromAttrs(attrs: NewsMatchBlockAttrs): MatchBlockSelector | null {
  const present = SELECTORS.filter((name) => {
    const value = attrs[name];

    return value != null && value.trim() !== "";
  });

  const [selector, ...others] = present;

  if (selector === undefined || others.length > 0) {
    return null;
  }

  const value = attrs[selector]?.trim() ?? "";
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

export function newsMatchBlockToAttrs(block: MatchBlockSelector): NewsMatchBlockAttrs {
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

  const attrs = parseAttrs(match[1] ?? match[2] ?? "");
  const block = attrs ? newsMatchBlockFromAttrs(attrs) : null;

  return block ? { block, raw: match[0] } : null;
}

export function serializeNewsMatchTag(block: MatchBlockSelector): string {
  const attrs = Object.entries(newsMatchBlockToAttrs(block))
    .filter(([, value]) => value != null)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");

  return `:matches{${attrs}}`;
}

export function newsMatchBlockKey(block: MatchBlockSelector): string {
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

export function parseNewsMatchBlockKey(key: string): MatchBlockSelector | null {
  const [kind, value, limit, ...rest] = key.split(":");

  if (rest.length > 0 || value == null) {
    return null;
  }

  let block: MatchBlockSelector | null;

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

function maskInlineCode(line: string): string {
  const runs = [...line.matchAll(BACKTICK_RUN_PATTERN)].map((run) => ({
    start: run.index,
    length: run[0].length,
  }));

  const closers = new Map<number, number>();
  const nextCloser: (number | undefined)[] = [];

  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run: (typeof runs)[number] | undefined = runs[index];

    if (run !== undefined) {
      nextCloser[index] = closers.get(run.length);
      closers.set(run.length, index);
    }
  }

  let masked = "";
  let copied = 0;
  let index = 0;

  while (index < runs.length) {
    const open: (typeof runs)[number] | undefined = runs[index];
    const closeIndex = nextCloser[index];

    const close: (typeof runs)[number] | undefined =
      closeIndex === undefined ? undefined : runs[closeIndex];

    if (open === undefined || closeIndex === undefined || close === undefined) {
      index += 1;
      continue;
    }

    const end = close.start + close.length;
    masked += line.slice(copied, open.start) + "x".repeat(end - open.start);
    copied = end;
    index = closeIndex + 1;
  }

  return masked + line.slice(copied);
}

function maskCode(content: string): string {
  let fence: string | null = null;

  return content
    .split("\n")
    .map((line) => {
      const marker = FENCE_PATTERN.exec(line)?.[1];

      if (fence !== null) {
        if (
          marker !== undefined &&
          marker.startsWith(fence.charAt(0)) &&
          marker.length >= fence.length &&
          line.trim() === marker
        ) {
          fence = null;
        }

        return "x".repeat(line.length);
      }

      if (marker !== undefined) {
        fence = marker;

        return "x".repeat(line.length);
      }

      return maskInlineCode(line);
    })
    .join("\n");
}

function isLineSpace(char: string | undefined): boolean {
  return char === " " || char === "\t" || char === "\r";
}

function isOwnLine(text: string, start: number, end: number): boolean {
  let before = start;

  while (start - before < MAX_TAG_INDENT && text[before - 1] === " ") {
    before -= 1;
  }

  let after = end;

  while (isLineSpace(text[after])) {
    after += 1;
  }

  return (
    (before === 0 || text[before - 1] === "\n") && (after === text.length || text[after] === "\n")
  );
}

interface ScannedMatchTag {
  raw: string;
  tag: NewsMatchTag | null;
}

function scanNewsMatchTags(content: string): ScannedMatchTag[] {
  const masked = maskCode(content);

  return [...masked.matchAll(MATCH_TAG_GLOBAL_PATTERN)].map((match) => {
    const end = match.index + match[0].length;
    const raw = content.slice(match.index, end);
    const tag = isOwnLine(masked, match.index, end) ? parseNewsMatchTag(raw) : null;

    return { raw, tag };
  });
}

export function extractNewsMatchBlocks(content: string): MatchBlockSelector[] {
  const blocks = new Map<string, MatchBlockSelector>();

  for (const { tag } of scanNewsMatchTags(content)) {
    if (tag) {
      blocks.set(newsMatchBlockKey(tag.block), tag.block);
    }
  }

  return [...blocks.values()];
}

export function findInvalidNewsMatchTags(content: string): string[] {
  return scanNewsMatchTags(content)
    .filter(({ tag }) => !tag)
    .map(({ raw }) => raw);
}

export function newsMatchTagStart(content: string): number {
  const block = content.indexOf(MATCH_BLOCK_OPENER);

  return block !== -1 ? block : content.indexOf(MATCH_INLINE_OPENER);
}

export function stripNewsMatchTags(content: string): string {
  return content.replace(MATCH_TAG_GLOBAL_PATTERN, " ");
}
