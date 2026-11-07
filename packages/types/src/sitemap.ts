export const SITEMAP_KINDS = ["tournaments", "matches", "players", "teams"] as const;

export type SitemapKind = (typeof SITEMAP_KINDS)[number];

export interface SitemapEntry {
  path: string;
  lastmod: string | null;
}

export interface SitemapIndexResponse {
  chunkCounts: Record<SitemapKind, number>;
}

export interface SitemapChunkResponse {
  data: SitemapEntry[];
}
