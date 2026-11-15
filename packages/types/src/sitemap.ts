export const SITEMAP_KINDS = [
  "news",
  "tournaments",
  "matches",
  "players",
  "staff",
  "teams",
  "circuits",
  "seasons",
  "countries",
  "forum",
] as const;

export type SitemapKind = (typeof SITEMAP_KINDS)[number];

export interface SitemapEntry {
  path: string;
  lastmod: string | null;
}
