import { log } from "evlog";
import { z } from "zod";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentService } from "../../application/tournament.service";
import { TOURNAMENT_SOURCES } from "../../domain/tournament-source";
import { mapTournament, type TournamentResponse } from "../http/tournament.mapper";

const date = z.iso.datetime().transform((value) => new Date(value));
const nullableText = z.string().nullable();
const team = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  imageUrl: nullableText,
  location: nullableText,
});
const player = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  birthday: date.nullable(),
  nationality: nullableText,
  firstName: nullableText,
  lastName: nullableText,
  imageUrl: nullableText,
  role: nullableText,
  team: team.nullable(),
});
const participant = z.object({
  id: z.string(),
  team,
  players: z.array(player),
  createdAt: date,
  updatedAt: date,
});
const match = z.object({
  id: z.string(),
  publicId: z.number().int().positive(),
  pandascoreId: z.number().nullable(),
  name: z.string(),
  slug: z.string(),
  beginAt: date.nullable(),
  endAt: date.nullable(),
  status: nullableText,
  numberOfGames: z.number().nullable(),
  createdAt: date,
  updatedAt: date,
  participants: z.array(participant),
  winner: participant.nullable(),
  results: z.array(z.object({ participant: z.string(), score: z.number() })),
  previousMatches: z.array(
    z.object({ match: z.string(), previousMatch: z.string(), type: z.enum(["winner", "loser"]) }),
  ),
  officialStreams: z.array(z.object({ url: z.string(), language: z.string(), main: z.boolean() })),
});
const tournament = z.object({
  id: z.string(),
  pandascoreId: z.number().nullable(),
  source: z.enum(TOURNAMENT_SOURCES),
  name: z.string(),
  description: nullableText,
  slug: z.string(),
  event: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  tier: nullableText,
  beginAt: date.nullable(),
  endAt: date.nullable(),
  winnerType: nullableText,
  type: nullableText,
  country: nullableText,
  prizepool: nullableText,
  imageUrl: nullableText,
  pickemsEnabled: z.boolean(),
  hasBracket: z.boolean(),
  createdAt: date,
  updatedAt: date,
  league: z
    .object({
      id: z.string(),
      pandascoreId: z.number(),
      name: z.string(),
      slug: nullableText,
      url: nullableText,
      imageUrl: nullableText,
    })
    .nullable(),
  winner: participant.nullable(),
  participants: z.array(participant),
  matches: z.array(match),
});

export class CachedTournamentRead {
  constructor(
    private readonly tournaments: Pick<TournamentService, "findById">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async findById(id: string): Promise<TournamentResponse | null> {
    const key = `tournament:${id}`;
    const cached = await this.readCached(key, id);
    if (cached) return cached;

    const model = await this.tournaments.findById(id);
    if (!model) return null;
    const mapped = mapTournament(model, { includeMatches: true });
    try {
      await this.redis.set(key, JSON.stringify(mapped), 60);
    } catch (error) {
      this.diagnose(key, "write", error instanceof Error ? error : new Error(String(error)));
    }
    return mapped;
  }

  private async readCached(key: string, id: string): Promise<TournamentResponse | null> {
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
