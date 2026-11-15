import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchSitemapRow, SitemapQueries } from "./ports";
import { SitemapService } from "./sitemap.service";

const team = (name: string) => ({ team: { name } });

describe(SitemapService, () => {
  const queries = {
    circuits: vi.fn<SitemapQueries["circuits"]>(),
    countryCodes: vi.fn<SitemapQueries["countryCodes"]>(),
    forumPosts: vi.fn<SitemapQueries["forumPosts"]>(),
    matches: vi.fn<SitemapQueries["matches"]>(),
    news: vi.fn<SitemapQueries["news"]>(),
    playerSlugs: vi.fn<SitemapQueries["playerSlugs"]>(),
    seasons: vi.fn<SitemapQueries["seasons"]>(),
    staffSlugs: vi.fn<SitemapQueries["staffSlugs"]>(),
    stages: vi.fn<SitemapQueries["stages"]>(),
    teamSlugs: vi.fn<SitemapQueries["teamSlugs"]>(),
    weeklyDigests: vi.fn<SitemapQueries["weeklyDigests"]>(),
  };

  const service = new SitemapService(queries);
  const older = new Date("2026-02-01T00:00:00.000Z");
  const lastmod = new Date("2026-03-01T12:00:00.000Z");

  const match = (overrides: Partial<MatchSitemapRow>): MatchSitemapRow => ({
    lastmod,
    name: "Grand Final",
    participants: [team("Vitality"), team("Karmine Corp")],
    publicId: 42,
    status: "not_started",
    tournament: { event: { slug: "rlcs-2026" }, slug: "major-1" },
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links news to their article", async () => {
    queries.news.mockResolvedValue([{ lastmod, slug: "a-news" }]);
    queries.weeklyDigests.mockResolvedValue([]);

    await expect(service.entries("news")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/news/a-news" },
    ]);
  });

  it("links each week of short news once, dated by its latest short", async () => {
    queries.news.mockResolvedValue([]);
    queries.weeklyDigests.mockResolvedValue([
      { createdAt: new Date("2026-03-02T10:00:00.000Z"), lastmod: older },
      { createdAt: new Date("2026-03-08T22:00:00.000Z"), lastmod },
      { createdAt: new Date("2026-03-09T08:00:00.000Z"), lastmod: older },
    ]);

    await expect(service.entries("news")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/news/week/2026-W10" },
      { lastmod: older.toISOString(), path: "/news/week/2026-W11" },
    ]);
  });

  it("links circuits, season archives, countries and forum posts", async () => {
    queries.circuits.mockResolvedValue([{ lastmod, slug: "rlcs-2026-europe" }]);
    queries.seasons.mockResolvedValue([{ lastmod, slug: "rlcs-season-8" }]);
    queries.countryCodes.mockResolvedValue(["FR"]);
    queries.forumPosts.mockResolvedValue([{ lastmod, publicId: 7, title: "Who wins Worlds?" }]);

    await expect(service.entries("circuits")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/circuits/rlcs-2026-europe" },
    ]);
    await expect(service.entries("seasons")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/seasons/rlcs-season-8" },
    ]);
    await expect(service.entries("countries")).resolves.toStrictEqual([
      { lastmod: null, path: "/countries/fr" },
    ]);
    await expect(service.entries("forum")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/forum/post/7/who-wins-worlds" },
    ]);
  });

  it("links each event once, dated by its latest stage, and each of its stages", async () => {
    queries.stages.mockResolvedValue([
      { eventSlug: "rlcs-2026", lastmod: older, slug: "major-1" },
      { eventSlug: "rlcs-2026", lastmod, slug: "major-2" },
    ]);

    await expect(service.entries("tournaments")).resolves.toStrictEqual([
      { lastmod: lastmod.toISOString(), path: "/tournaments/rlcs-2026" },
      { lastmod: older.toISOString(), path: "/tournaments/rlcs-2026/major-1" },
      { lastmod: lastmod.toISOString(), path: "/tournaments/rlcs-2026/major-2" },
    ]);
  });

  it("links a match to the canonical slug its page redirects to", async () => {
    queries.matches.mockResolvedValue([match({})]);

    await expect(service.entries("matches")).resolves.toStrictEqual([
      {
        lastmod: lastmod.toISOString(),
        path: "/matches/42/karmine-corp-vs-vitality-rlcs-2026-major-1",
      },
    ]);
  });

  it.each([
    ["canceled", { status: "canceled" }],
    ["without teams", { participants: [] }],
    ["with one team", { participants: [team("Vitality")] }],
    ["with a TBD team", { participants: [team("Vitality"), team(" tbd ")] }],
    ["with a blank team", { participants: [team("Vitality"), team("  ")] }],
  ])("leaves out a match %s", async (_label, overrides) => {
    queries.matches.mockResolvedValue([match(overrides)]);

    await expect(service.entries("matches")).resolves.toStrictEqual([]);
  });

  it("keeps a match whose status is unknown", async () => {
    queries.matches.mockResolvedValue([match({ status: null })]);

    await expect(service.entries("matches")).resolves.toHaveLength(1);
  });

  it("links players, staff and teams without an unknown modification date", async () => {
    queries.playerSlugs.mockResolvedValue(["zen"]);
    queries.staffSlugs.mockResolvedValue(["coach"]);
    queries.teamSlugs.mockResolvedValue(["vitality"]);

    await expect(service.entries("players")).resolves.toStrictEqual([
      { lastmod: null, path: "/player/zen" },
    ]);
    await expect(service.entries("staff")).resolves.toStrictEqual([
      { lastmod: null, path: "/staff/coach" },
    ]);
    await expect(service.entries("teams")).resolves.toStrictEqual([
      { lastmod: null, path: "/team/vitality" },
    ]);
  });
});
