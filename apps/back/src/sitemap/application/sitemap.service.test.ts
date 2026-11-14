import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchSitemapRow, SitemapQueries } from "./ports";
import { SitemapService } from "./sitemap.service";

const team = (name: string) => ({ team: { name } });

describe(SitemapService, () => {
  const queries = {
    news: vi.fn<SitemapQueries["news"]>(),
    stages: vi.fn<SitemapQueries["stages"]>(),
    matches: vi.fn<SitemapQueries["matches"]>(),
    playerSlugs: vi.fn<SitemapQueries["playerSlugs"]>(),
    staffSlugs: vi.fn<SitemapQueries["staffSlugs"]>(),
    teamSlugs: vi.fn<SitemapQueries["teamSlugs"]>(),
  };

  const service = new SitemapService(queries);
  const older = new Date("2026-02-01T00:00:00.000Z");
  const lastmod = new Date("2026-03-01T12:00:00.000Z");

  const match = (overrides: Partial<MatchSitemapRow>): MatchSitemapRow => ({
    publicId: 42,
    name: "Grand Final",
    status: "not_started",
    participants: [team("Vitality"), team("Karmine Corp")],
    tournament: { slug: "major-1", event: { slug: "rlcs-2026" } },
    lastmod,
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links news to their article", async () => {
    queries.news.mockResolvedValue([{ slug: "a-news", lastmod }]);

    await expect(service.entries("news")).resolves.toStrictEqual([
      { path: "/news/a-news", lastmod: lastmod.toISOString() },
    ]);
  });

  it("links each event once, dated by its latest stage, and each of its stages", async () => {
    queries.stages.mockResolvedValue([
      { slug: "major-1", eventSlug: "rlcs-2026", lastmod: older },
      { slug: "major-2", eventSlug: "rlcs-2026", lastmod },
    ]);

    await expect(service.entries("tournaments")).resolves.toStrictEqual([
      { path: "/tournaments/rlcs-2026", lastmod: lastmod.toISOString() },
      { path: "/tournaments/rlcs-2026/major-1", lastmod: older.toISOString() },
      { path: "/tournaments/rlcs-2026/major-2", lastmod: lastmod.toISOString() },
    ]);
  });

  it("links a match to the canonical slug its page redirects to", async () => {
    queries.matches.mockResolvedValue([match({})]);

    await expect(service.entries("matches")).resolves.toStrictEqual([
      {
        path: "/matches/42/karmine-corp-vs-vitality-rlcs-2026-major-1",
        lastmod: lastmod.toISOString(),
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
      { path: "/player/zen", lastmod: null },
    ]);
    await expect(service.entries("staff")).resolves.toStrictEqual([
      { path: "/staff/coach", lastmod: null },
    ]);
    await expect(service.entries("teams")).resolves.toStrictEqual([
      { path: "/team/vitality", lastmod: null },
    ]);
  });
});
