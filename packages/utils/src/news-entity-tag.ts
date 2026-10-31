import { parseNewsTagAttrs } from "./news-tag-attrs.ts";

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

/** Matches `:player{...}` or `:team{...}` at the start of a string. */
export const NEWS_ENTITY_TAG_PATTERN = /^:(player|team)\{([^}]*)\}/;

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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

/**
 * Parse an inline MDC entity tag such as `:player{slug="jstn" label="jstn"}`.
 */
export function parseNewsEntityTag(raw: string): NewsEntityTag | null {
  const match = raw.match(NEWS_ENTITY_TAG_PATTERN);
  if (!match) {
    return null;
  }

  const kind = match[1] as NewsEntityTagKind;
  const attrs = parseAttrs(match[2] ?? "");
  const slug = attrs.slug?.trim();
  const label = attrs.label?.trim();

  if (!slug || !label) {
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
  const slug = escapeAttrValue(input.slug.trim());
  const label = escapeAttrValue(input.label.trim());
  return `:${input.kind}{slug="${slug}" label="${label}"}`;
}
