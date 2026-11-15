import type { MatchSlugSource } from "../../tournament/domain/match";

export interface SlugSitemapRow {
  slug: string;
  lastmod: Date;
}

export interface WeeklyDigestSitemapRow {
  createdAt: Date;
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

export interface ForumPostSitemapRow {
  publicId: number;
  title: string;
  lastmod: Date;
}

export interface SitemapQueries {
  news: () => Promise<SlugSitemapRow[]>;
  weeklyDigests: () => Promise<WeeklyDigestSitemapRow[]>;
  stages: () => Promise<StageSitemapRow[]>;
  matches: () => Promise<MatchSitemapRow[]>;
  playerSlugs: () => Promise<string[]>;
  staffSlugs: () => Promise<string[]>;
  teamSlugs: () => Promise<string[]>;
  circuits: () => Promise<SlugSitemapRow[]>;
  seasons: () => Promise<SlugSitemapRow[]>;
  countryCodes: () => Promise<string[]>;
  forumPosts: () => Promise<ForumPostSitemapRow[]>;
}
