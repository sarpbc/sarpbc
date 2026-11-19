import type {
  ForumPostSitemapRow,
  MatchSitemapRow,
  SitemapQueries,
  SlugSitemapRow,
  StageSitemapRow,
  WeeklyDigestSitemapRow,
} from "./ports";

export interface SitemapRows {
  news: SlugSitemapRow[];
  weeklyDigests: WeeklyDigestSitemapRow[];
  stages: StageSitemapRow[];
  matches: MatchSitemapRow[];
  playerSlugs: string[];
  staffSlugs: string[];
  teamSlugs: string[];
  circuits: SlugSitemapRow[];
  seasons: SlugSitemapRow[];
  countryCodes: string[];
  forumPosts: ForumPostSitemapRow[];
}

export class MemorySitemapQueries implements SitemapQueries {
  constructor(private readonly rows: Partial<SitemapRows> = {}) {}

  async news() {
    return await Promise.resolve(this.rows.news ?? []);
  }

  async weeklyDigests() {
    return await Promise.resolve(this.rows.weeklyDigests ?? []);
  }

  async stages() {
    return await Promise.resolve(this.rows.stages ?? []);
  }

  async matches() {
    return await Promise.resolve(this.rows.matches ?? []);
  }

  async playerSlugs() {
    return await Promise.resolve(this.rows.playerSlugs ?? []);
  }

  async staffSlugs() {
    return await Promise.resolve(this.rows.staffSlugs ?? []);
  }

  async teamSlugs() {
    return await Promise.resolve(this.rows.teamSlugs ?? []);
  }

  async circuits() {
    return await Promise.resolve(this.rows.circuits ?? []);
  }

  async seasons() {
    return await Promise.resolve(this.rows.seasons ?? []);
  }

  async countryCodes() {
    return await Promise.resolve(this.rows.countryCodes ?? []);
  }

  async forumPosts() {
    return await Promise.resolve(this.rows.forumPosts ?? []);
  }
}
