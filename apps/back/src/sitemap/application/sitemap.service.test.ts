import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { SITEMAP_CHUNK_SIZE, SitemapService } from "./sitemap.service";

describe("SitemapService", () => {
  const queries = {
    counts: vi.fn(),
    tournaments: vi.fn(),
    matches: vi.fn(),
    playerSlugs: vi.fn(),
    teamSlugs: vi.fn(),
  };
  const service = new SitemapService(queries);
  const lastmod = new Date("2026-03-01T12:00:00.000Z");

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("exposes no chunk for an empty kind and opens a new chunk past the size", async () => {
    queries.counts.mockResolvedValue({
      tournaments: 0,
      matches: SITEMAP_CHUNK_SIZE,
      players: SITEMAP_CHUNK_SIZE + 1,
      teams: 1,
    });

    await expect(service.index()).resolves.toEqual({
      chunkCounts: { tournaments: 0, matches: 1, players: 2, teams: 1 },
    });
  });

  it("links events and stages to their own pages", async () => {
    queries.tournaments.mockResolvedValue([
      { eventSlug: "rlcs-2026", stageSlug: null, lastmod },
      { eventSlug: "rlcs-2026", stageSlug: "major-1", lastmod },
    ]);

    await expect(service.chunk("tournaments", 0)).resolves.toEqual({
      data: [
        { path: "/tournaments/rlcs-2026", lastmod: lastmod.toISOString() },
        { path: "/tournaments/rlcs-2026/major-1", lastmod: lastmod.toISOString() },
      ],
    });
  });

  it("links a match to the canonical slug its page redirects to", async () => {
    queries.matches.mockResolvedValue([
      {
        publicId: 42,
        name: "Grand Final",
        eventSlug: "rlcs-2026",
        stageSlug: "major-1",
        teamNames: ["Vitality", "Karmine Corp"],
        lastmod,
      },
    ]);

    await expect(service.chunk("matches", 0)).resolves.toEqual({
      data: [
        {
          path: "/matches/42/karmine-corp-vs-vitality-rlcs-2026-major-1",
          lastmod: lastmod.toISOString(),
        },
      ],
    });
  });

  it("links players and teams without an unknown modification date", async () => {
    queries.playerSlugs.mockResolvedValue(["zen"]);
    queries.teamSlugs.mockResolvedValue(["vitality"]);

    await expect(service.chunk("players", 0)).resolves.toEqual({
      data: [{ path: "/player/zen", lastmod: null }],
    });
    await expect(service.chunk("teams", 0)).resolves.toEqual({
      data: [{ path: "/team/vitality", lastmod: null }],
    });
  });

  it("reads the requested chunk", async () => {
    queries.playerSlugs.mockResolvedValue(["zen"]);

    await service.chunk("players", 2);

    expect(queries.playerSlugs).toHaveBeenCalledWith({
      offset: 2 * SITEMAP_CHUNK_SIZE,
      limit: SITEMAP_CHUNK_SIZE,
    });
  });

  it("404s a chunk past the end", async () => {
    queries.teamSlugs.mockResolvedValue([]);

    await expect(service.chunk("teams", 3)).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each([-1, Number.MAX_SAFE_INTEGER])("rejects chunk %d before querying", async (chunk) => {
    await expect(service.chunk("teams", chunk)).rejects.toBeInstanceOf(InvalidInputError);
    expect(queries.teamSlugs).not.toHaveBeenCalled();
  });
});
