import { log } from "evlog";
import { z } from "zod";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentQueries } from "../../application/ports";
import { DATA_SOURCES, STREAM_KINDS, STREAM_PLATFORMS, TOURNAMENT_FORMATS } from "@sarpbc/types";
import { mapTournamentDetail } from "../http/tournament.mapper";
import type { TournamentDetailResponse } from "../http/tournament.mapper";

const date = z.iso.datetime().transform((value) => new Date(value));
const nullableText = z.string().nullable();

const team = z.strictObject({
  id: z.string(),
  imageUrl: nullableText,
  location: nullableText,
  logoDarkUrl: nullableText,
  logoLightUrl: nullableText,
  name: z.string(),
  slug: z.string(),
});

const participantRef = z.union([
  z.strictObject({ id: z.string(), team }),
  z.strictObject({
    id: z.string(),
    players: z.array(
      z.strictObject({
        id: z.string(),
        imageUrl: nullableText,
        name: z.string(),
        slug: z.string(),
      }),
    ),
    team: z.null(),
  }),
]);

const participant = z.strictObject({
  id: z.string(),
  players: z.array(
    z.strictObject({
      id: z.string(),
      imageUrl: nullableText,
      name: z.string(),
      nationality: nullableText,
      slug: z.string(),
    }),
  ),
  rosterSourceUrl: nullableText,
  team: team.nullable(),
});

const match = z.strictObject({
  beginAt: date.nullable(),
  endAt: date.nullable(),
  forfeitedBy: nullableText,
  id: z.string(),
  name: z.string(),
  numberOfGames: z.number().nullable(),
  participants: z.array(participantRef),
  previousMatches: z.array(
    z.strictObject({ previousMatch: z.string(), type: z.enum(["winner", "loser"]) }),
  ),
  publicId: z.number().int().positive(),
  results: z.array(z.strictObject({ participant: z.string(), score: z.number() })),
  slug: z.string(),
  sourceUrl: nullableText,
  status: nullableText,
  winnerId: nullableText,
});

const stream = z.strictObject({
  channel: z.string(),
  kind: z.enum(STREAM_KINDS),
  language: z.string(),
  platform: z.enum(STREAM_PLATFORMS),
  source: z.enum(DATA_SOURCES),
  url: z.string(),
});

const tournament = z.strictObject({
  beginAt: date.nullable(),
  country: nullableText,
  endAt: date.nullable(),
  event: z.strictObject({ id: z.string(), name: z.string(), slug: z.string() }),
  format: z.enum(TOURNAMENT_FORMATS),
  hasBracket: z.boolean(),
  id: z.string(),
  imageUrl: nullableText,
  league: z
    .object({ id: z.string(), imageUrl: nullableText, name: z.string(), url: nullableText })
    .nullable(),
  matches: z.array(match),
  name: z.string(),
  participants: z.array(participant),
  pickemsEnabled: z.boolean(),
  prizepool: nullableText,
  slug: z.string(),
  source: z.enum(DATA_SOURCES),
  tier: nullableText,
  type: nullableText,
  watchStreams: z.array(stream),
  winner: participantRef.nullable(),
}) satisfies z.ZodType<TournamentDetailResponse>;

export const tournamentCacheKey = (id: string): string => `tournament:${id}`;

const diagnose = (key: string, operation: string, error: Error): void => {
  log.warn({
    component: "CachedTournamentRead",
    error,
    key,
    message: "Optional tournament cache failed",
    operation,
  });
};

export class CachedTournamentRead {
  constructor(
    private readonly tournaments: Pick<TournamentQueries, "findById">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async findById(id: string): Promise<TournamentDetailResponse | null> {
    const key = tournamentCacheKey(id);
    const cached = await this.readCached(key, id);

    if (cached) {
      return cached;
    }

    const model = await this.tournaments.findById(id);

    if (!model) {
      return null;
    }

    const mapped = mapTournamentDetail(model);

    try {
      await this.redis.set(key, JSON.stringify(mapped), 60);
    } catch (error) {
      diagnose(key, "write", error instanceof Error ? error : new Error(String(error)));
    }

    return mapped;
  }

  private async readCached(key: string, id: string): Promise<TournamentDetailResponse | null> {
    try {
      const cached = await this.redis.get(key);

      if (cached === null) {
        return null;
      }

      const decoded: unknown = JSON.parse(cached);
      const result = tournament.safeParse(decoded);

      if (!result.success) {
        diagnose(key, "decode", result.error);

        return null;
      }

      if (result.data.id !== id) {
        diagnose(key, "decode", new Error("Cached tournament ID does not match its key"));

        return null;
      }

      return result.data;
    } catch (error) {
      diagnose(key, "read", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }
}
