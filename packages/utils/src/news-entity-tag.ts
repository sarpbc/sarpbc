import { escapeNewsTagAttrValue, parseNewsTagAttrs } from "./news-tag-attrs";
import { isNonEmptyString } from "./text";

export type NewsEntityTagKind = "player" | "team";

export interface NewsEntityTag {
  kind: NewsEntityTagKind;
  slug: string;
  label: string;
  raw: string;
}

interface NewsEntityTagAttrs {
  slug?: string;
  label?: string;
}

const ENTITY_TAG_SOURCE = String.raw`:(player|team)\{([^}]*)\}`;
const NEWS_ENTITY_TAG_PATTERN = new RegExp(`^${ENTITY_TAG_SOURCE}`);
const NEWS_ENTITY_TAG_GLOBAL_PATTERN = new RegExp(ENTITY_TAG_SOURCE, "g");

function parseAttrs(rawAttrs: string): NewsEntityTagAttrs {
  const attrs: NewsEntityTagAttrs = {};

  for (const { name, value } of parseNewsTagAttrs(rawAttrs)) {
    if (name === "slug") {
      attrs.slug = value;
    } else if (name === "label") {
      attrs.label = value;
    }
  }

  return attrs;
}

export function parseNewsEntityTag(raw: string): NewsEntityTag | null {
  const match = raw.match(NEWS_ENTITY_TAG_PATTERN);

  if (!match) {
    return null;
  }

  const kind = match[1];
  const attrs = parseAttrs(match[2] ?? "");
  const slug = attrs.slug?.trim();
  const label = attrs.label?.trim();

  if (
    (kind !== "player" && kind !== "team") ||
    !isNonEmptyString(slug) ||
    !isNonEmptyString(label)
  ) {
    return null;
  }

  return {
    kind,
    slug,
    label,
    raw: match[0],
  };
}

export function serializeNewsEntityTag(input: {
  kind: NewsEntityTagKind;
  slug: string;
  label: string;
}): string {
  const slug = escapeNewsTagAttrValue(input.slug.trim());
  const label = escapeNewsTagAttrValue(input.label.trim());

  return `:${input.kind}{slug="${slug}" label="${label}"}`;
}

export function newsEntityTagStart(content: string, kind: NewsEntityTagKind): number {
  return content.indexOf(`:${kind}{`);
}

export function replaceNewsEntityTagsWithLabels(content: string): string {
  return content.replaceAll(
    NEWS_ENTITY_TAG_GLOBAL_PATTERN,
    (raw) => parseNewsEntityTag(raw)?.label ?? "",
  );
}
