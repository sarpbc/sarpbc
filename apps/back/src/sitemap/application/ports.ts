import type { MatchSlugSource } from "../../tournament/domain/competition";

export interface NewsSitemapRow {
  slug: string;
  lastmod: Date;
}

export interface StageSitemapRow {
  slug: string;
  eventSlug: string;
  lastmod: Date;
}

export interface MatchSitemapRow extends MatchSlugSource {
  publicId: number;
  status: string | null;
  lastmod: Date;
}

export interface SitemapQueries {
  news(): Promise<NewsSitemapRow[]>;
  stages(): Promise<StageSitemapRow[]>;
  matches(): Promise<MatchSitemapRow[]>;
  playerSlugs(): Promise<string[]>;
  teamSlugs(): Promise<string[]>;
}
