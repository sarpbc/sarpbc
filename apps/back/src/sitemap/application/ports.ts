import type { SitemapKind } from "@sarpbc/types";

export interface TournamentSitemapRow {
  eventSlug: string;
  stageSlug: string | null;
  lastmod: Date;
}

export interface MatchSitemapRow {
  publicId: number;
  name: string;
  eventSlug: string;
  stageSlug: string;
  teamNames: [string, string];
  lastmod: Date;
}

export interface SitemapPage {
  offset: number;
  limit: number;
}

export interface SitemapQueries {
  counts(): Promise<Record<SitemapKind, number>>;
  tournaments(page: SitemapPage): Promise<TournamentSitemapRow[]>;
  matches(page: SitemapPage): Promise<MatchSitemapRow[]>;
  playerSlugs(page: SitemapPage): Promise<string[]>;
  teamSlugs(page: SitemapPage): Promise<string[]>;
}
