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
const NEWS_ENTITY_TAG_PATTERN = new RegExp(`^${ENTITY_TAG_SOURCE}`, "u");
const NEWS_ENTITY_TAG_GLOBAL_PATTERN = new RegExp(ENTITY_TAG_SOURCE, "gu");

const parseAttrs = (rawAttrs: string): NewsEntityTagAttrs => {
  const attrs: NewsEntityTagAttrs = {};

  for (const { name, value } of parseNewsTagAttrs(rawAttrs)) {
    if (name === "slug") {
      attrs.slug = value;
    } else if (name === "label") {
      attrs.label = value;
    }
  }

  return attrs;
};

export const parseNewsEntityTag = (raw: string): NewsEntityTag | null => {
  const match = raw.match(NEWS_ENTITY_TAG_PATTERN);

  if (!match) {
    return null;
  }

  const [, kind, rawAttrs] = match;
  const attrs = parseAttrs(rawAttrs ?? "");
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
};

export const serializeNewsEntityTag = (input: {
  kind: NewsEntityTagKind;
  slug: string;
  label: string;
}): string => {
  const slug = escapeNewsTagAttrValue(input.slug.trim());
  const label = escapeNewsTagAttrValue(input.label.trim());

  return `:${input.kind}{slug="${slug}" label="${label}"}`;
};

export const newsEntityTagStart = (content: string, kind: NewsEntityTagKind): number =>
  content.indexOf(`:${kind}{`);

export const replaceNewsEntityTagsWithLabels = (content: string): string =>
  content.replaceAll(NEWS_ENTITY_TAG_GLOBAL_PATTERN, (raw) => parseNewsEntityTag(raw)?.label ?? "");
