import { log } from "evlog";
import { z } from "zod";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentQueries } from "../../application/ports";
import { DATA_SOURCES, STREAM_KINDS, STREAM_PLATFORMS, TOURNAMENT_FORMATS } from "@sarpbc/types";
import { mapTournamentDetail, type TournamentDetailResponse } from "../http/tournament.mapper";

const date = z.iso.datetime().transform((value) => new Date(value));
const nullableText = z.string().nullable();

const team = z.strictObject({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  imageUrl: nullableText,
  logoLightUrl: nullableText,
  logoDarkUrl: nullableText,
  location: nullableText,
});

const participantRef = z.union([
  z.strictObject({ id: z.string(), team }),
  z.strictObject({
    id: z.string(),
    team: z.null(),
    players: z.array(z.strictObject({ id: z.string(), name: z.string(), slug: z.string() })),
  }),
]);

const participant = z.strictObject({
  id: z.string(),
  team: team.nullable(),
  players: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      nationality: nullableText,
    }),
  ),
  rosterSourceUrl: nullableText,
});

const match = z.strictObject({
  id: z.string(),
  publicId: z.number().int().positive(),
  slug: z.string(),
  name: z.string(),
  status: nullableText,
  beginAt: date.nullable(),
  endAt: date.nullable(),
  numberOfGames: z.number().nullable(),
  winnerId: nullableText,
  participants: z.array(participantRef),
  results: z.array(z.strictObject({ participant: z.string(), score: z.number() })),
  previousMatches: z.array(
    z.strictObject({ previousMatch: z.string(), type: z.enum(["winner", "loser"]) }),
  ),
  sourceUrl: nullableText,
});

const stream = z.strictObject({
  url: z.string(),
  platform: z.enum(STREAM_PLATFORMS),
  channel: z.string(),
  language: z.string(),
  kind: z.enum(STREAM_KINDS),
  source: z.enum(DATA_SOURCES),
});

const tournament = z.strictObject({
  id: z.string(),
  source: z.enum(DATA_SOURCES),
  format: z.enum(TOURNAMENT_FORMATS),
  name: z.string(),
  slug: z.string(),
  event: z.strictObject({ id: z.string(), slug: z.string(), name: z.string() }),
  tier: nullableText,
  type: nullableText,
  country: nullableText,
  prizepool: nullableText,
  imageUrl: nullableText,
  beginAt: date.nullable(),
  endAt: date.nullable(),
  pickemsEnabled: z.boolean(),
  hasBracket: z.boolean(),
  league: z
    .object({ id: z.string(), name: z.string(), imageUrl: nullableText, url: nullableText })
    .nullable(),
  winner: participantRef.nullable(),
  participants: z.array(participant),
  matches: z.array(match),
  watchStreams: z.array(stream),
}) satisfies z.ZodType<TournamentDetailResponse>;

export const tournamentCacheKey = (id: string): string => `tournament:${id}`;

export class CachedTournamentRead {
  constructor(
    private readonly tournaments: Pick<TournamentQueries, "findById">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async findById(id: string): Promise<TournamentDetailResponse | null> {
    const key = tournamentCacheKey(id);
    const cached = await this.readCached(key, id);

    if (cached) return cached;

    const model = await this.tournaments.findById(id);

    if (!model) return null;
    const mapped = mapTournamentDetail(model);

    try {
      await this.redis.set(key, JSON.stringify(mapped), 60);
    } catch (error) {
      this.diagnose(key, "write", error instanceof Error ? error : new Error(String(error)));
    }

    return mapped;
  }

  private async readCached(key: string, id: string): Promise<TournamentDetailResponse | null> {
    try {
      const cached = await this.redis.get(key);

      if (cached === null) return null;
      const decoded: unknown = JSON.parse(cached);
      const result = tournament.safeParse(decoded);

      if (!result.success) {
        this.diagnose(key, "decode", result.error);

        return null;
      }

      if (result.data.id !== id) {
        this.diagnose(key, "decode", new Error("Cached tournament ID does not match its key"));

        return null;
      }

      return result.data;
    } catch (error) {
      this.diagnose(key, "read", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }

  private diagnose(key: string, operation: string, error: Error): void {
    log.warn({
      component: CachedTournamentRead.name,
      message: "Optional tournament cache failed",
      key,
      operation,
      error,
    });
  }
}
