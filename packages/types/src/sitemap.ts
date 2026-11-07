export const SITEMAP_KINDS = ["news", "tournaments", "matches", "players", "teams"] as const;

export type SitemapKind = (typeof SITEMAP_KINDS)[number];

export interface SitemapEntry {
  path: string;
  lastmod: string | null;
}
