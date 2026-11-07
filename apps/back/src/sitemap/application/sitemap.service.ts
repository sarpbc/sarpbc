import type {
  SitemapChunkResponse,
  SitemapEntry,
  SitemapIndexResponse,
  SitemapKind,
} from "@sarpbc/types";
import {
  matchPath,
  matchSlug,
  playerPath,
  teamPath,
  tournamentEventPath,
  tournamentStagePath,
} from "@sarpbc/utils";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { SitemapPage, SitemapQueries } from "./ports";

/** Each entity yields one URL per locale, so a chunk holds twice this many URLs. */
export const SITEMAP_CHUNK_SIZE = 1000;

export class SitemapService {
  constructor(private readonly queries: SitemapQueries) {}

  async index(): Promise<SitemapIndexResponse> {
    const { tournaments, matches, players, teams } = await this.queries.counts();
    return {
      chunkCounts: {
        tournaments: Math.ceil(tournaments / SITEMAP_CHUNK_SIZE),
        matches: Math.ceil(matches / SITEMAP_CHUNK_SIZE),
        players: Math.ceil(players / SITEMAP_CHUNK_SIZE),
        teams: Math.ceil(teams / SITEMAP_CHUNK_SIZE),
      },
    };
  }

  async chunk(kind: SitemapKind, chunk: number): Promise<SitemapChunkResponse> {
    const offset = chunk * SITEMAP_CHUNK_SIZE;
    if (chunk < 0 || !Number.isSafeInteger(offset)) {
      throw new InvalidInputError("Sitemap chunk must be a non-negative integer.");
    }
    const data = await this.entries(kind, { offset, limit: SITEMAP_CHUNK_SIZE });
    if (!data.length) {
      throw new NotFoundError(`Sitemap chunk ${kind}/${chunk} was not found.`);
    }
    return { data };
  }

  private async entries(kind: SitemapKind, page: SitemapPage): Promise<SitemapEntry[]> {
    switch (kind) {
      case "tournaments":
        return (await this.queries.tournaments(page)).map((row) => ({
          path:
            row.stageSlug === null
              ? tournamentEventPath(row.eventSlug)
              : tournamentStagePath(row.eventSlug, row.stageSlug),
          lastmod: row.lastmod.toISOString(),
        }));
      case "matches":
        return (await this.queries.matches(page)).map((row) => ({
          path: matchPath(
            row.publicId,
            matchSlug({
              teamNames: row.teamNames,
              matchName: row.name,
              eventSlug: row.eventSlug,
              stageSlug: row.stageSlug,
            }),
          ),
          lastmod: row.lastmod.toISOString(),
        }));
      case "players":
        return (await this.queries.playerSlugs(page)).map((slug) => ({
          path: playerPath(slug),
          lastmod: null,
        }));
      case "teams":
        return (await this.queries.teamSlugs(page)).map((slug) => ({
          path: teamPath(slug),
          lastmod: null,
        }));
      default: {
        const unhandled: never = kind;
        return unhandled;
      }
    }
  }
}
