import type { Redis as RedisClient } from "ioredis";
import { test } from "vitest";
import { z } from "zod";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { verifyCircuits } from "./scenarios/circuits.mts";
import { verifyCompetitionImport } from "./scenarios/competition-import.mts";
import {
  verifyCompetitionSyncLookups,
  verifyPandascoreAdoption,
  verifyRedistributableScope,
} from "./scenarios/competition-sync-lookups.mts";
import { verifyPlayerAwards } from "./scenarios/player-awards.mts";
import { verifyPlayerTournaments } from "./scenarios/player-tournaments.mts";
import { verifyManualBrackets } from "./scenarios/manual-brackets.mts";
import { verifyMatchStats } from "./scenarios/match-stats.mts";
import { verifyOnThisDay } from "./scenarios/on-this-day.mts";
import { verifySeasonArchives, verifySeasonAwards } from "./scenarios/seasons.mts";
import { verifySitemap } from "./scenarios/sitemap.mts";
import { verifyStreamProposals, verifyStreams } from "./scenarios/streams.mts";
import { verifyLineupProposals, verifyLineups } from "./scenarios/lineups.mts";
import { verifyViewership, verifyViewershipProposals } from "./scenarios/viewership.mts";
import { verifyTeamAliasProposals, verifyTeamAliases } from "./scenarios/team-aliases.mts";
import { byJoined, reviewedProposal, toolFailure, toolProposal } from "./scenarios/support.mts";
import type {
  JsonResponse,
  Payload,
  Request,
  ReviewedProposal,
  ToolProposal,
} from "./scenarios/support.mts";
import type { EntityClass, FilterQuery } from "@mikro-orm/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type * as RosterRows from "../src/roster/infrastructure/persistence/player.entities.ts";

type Application = NestFastifyApplication;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compose = readFileSync(resolve(root, "../../docker-compose.local.yml"), "utf8");

const identified = z.object({ id: z.string() });

const userBody = identified.extend({ userName: z.string() });

const articleBody = identified.extend({ slug: z.string(), title: z.string() });

const teamBody = identified.extend({ slug: z.string(), name: z.string() });

const playerBody = identified.extend({ slug: z.string() });

const counted = z.object({ total: z.number() });

const pathEntry = z.object({ path: z.string() });

const photoBody = identified.extend({ url: z.string() });

const contractBody = identified.extend({ team: identified });

const participantBody = identified.extend({ team: teamBody });

const eventBody = identified.extend({ slug: z.string(), name: z.string() });

const tournamentBody = identified.extend({
  slug: z.string(),
  source: z.string(),
  event: eventBody,
  participants: z.array(participantBody),
});

const transferBody = z.object({
  type: z.string(),
  date: z.string(),
  team: z.object({ slug: z.string() }),
});

const vodBody = z.object({
  game: z.number(),
  url: z.string(),
  language: z.string(),
  source: z.string().optional(),
});

const tokenBody = identified.extend({ token: z.string() });

const eventList = z.object({
  count: z.number(),
  events: z.array(
    eventBody.extend({
      stages: z.array(z.object({ id: z.string(), matches: z.array(identified).optional() })),
    }),
  ),
});

const resolvedStage = z.object({
  kind: z.string(),
  tab: z.string(),
  tournament: identified,
});

const replyBody = identified.extend({ targetPath: z.string().optional() });

const notificationBody = identified.extend({ targetPath: z.string() });

type ContractWhere = FilterQuery<InstanceType<typeof RosterRows.Contract>>;

const mcpContract = identified.extend({
  team: identified,
  startDate: z.string(),
  endDate: z.string().nullable(),
  role: z.string(),
  leaveSourceUrl: z.string().nullable(),
});

interface ContractChanges {
  contractId?: string;
  endDate?: string | null;
  role?: string;
}

const sourcedBody = identified.extend({ source: z.string() });

const mcpMatch = identified.extend({ participants: z.array(participantBody) });

const mcpLimitedMatch = identified.extend({ participants: z.undefined().optional() });

const mcpCreatedTournament = identified.extend({ participants: z.array(participantBody) });

const mcpTournament = identified.extend({
  participants: z.array(participantBody),
  matches: z.array(
    identified.extend({
      participants: z.array(z.object({ team: z.object({ name: z.string() }) })),
    }),
  ),
});

const mcpLimitedTournament = identified.extend({ participants: z.undefined().optional() });

interface Mergeable {
  id: string;
  mergedInto?: Identified | null;
}

const postBody = identified.extend({
  title: z.string(),
  publicId: z.number(),
  slug: z.string(),
});

const matchBody = identified.extend({ publicId: z.number(), slug: z.string() });

type MatchBody = z.infer<typeof matchBody>;

type Identified = z.infer<typeof identified>;

type UserBody = z.infer<typeof userBody>;

type ArticleBody = z.infer<typeof articleBody>;

type TeamBody = z.infer<typeof teamBody>;

type PlayerBody = z.infer<typeof playerBody>;

type TournamentBody = z.infer<typeof tournamentBody>;

type VodBody = z.infer<typeof vodBody>;

type ReplyBody = z.infer<typeof replyBody>;

const jsonValue = z.json();

type JsonValue = z.infer<typeof jsonValue>;

const rpcMessage = z.object({
  error: z.unknown().optional(),
  result: z
    .object({
      isError: z.boolean().optional(),
      content: z.array(z.object({ text: z.string() })).optional(),
    })
    .optional(),
});

const portBindings = z.record(z.string(), z.array(z.object({ HostPort: z.string() })).nullable());

function composeImage(name: string): string {
  const image = new RegExp(`image: (${name}:\\S+)`).exec(compose)?.[1];

  if (image === undefined) throw new Error(`docker-compose.local.yml has no ${name} image`);

  return image;
}

test("complete backend workflows with PostgreSQL, Redis and MikroORM migrations", async () => {
  const containers: string[] = [];
  const results: string[] = [];
  const failures: unknown[] = [];
  let application: Application | undefined;
  let redisClient: RedisClient | undefined;

  function docker(...args: string[]): string {
    return execFileSync("docker", args, {
      encoding: "utf8",
      timeout: 30_000,
    }).trim();
  }

  async function container(
    service: string,
    image: string,
    port: number,
    environment: Record<string, string>,
    readiness: string[],
  ): Promise<number> {
    const name = `sarpbc-integration-${service}-${randomUUID()}`;
    docker(
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--publish",
      `127.0.0.1::${port}`,
      ...Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]),
      image,
    );
    containers.push(name);

    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker("exec", name, ...readiness);

        const binding = portBindings.parse(
          JSON.parse(docker("inspect", "--format", "{{json .NetworkSettings.Ports}}", name)),
        );

        const hostPort = binding[`${port}/tcp`]?.[0]?.HostPort;

        if (hostPort === undefined) throw new Error(`${service} port ${port} is not published`);

        return Number(hostPort);
      } catch {
        await delay(500);
      }
    }

    throw new Error(`${service} did not become ready within 30 seconds`);
  }

  async function check(name: string, work: () => Promise<void>): Promise<void> {
    await work();
    results.push(name);
    process.stdout.write(`PASS ${name}\n`);
  }

  function cookies(response: JsonResponse): string {
    const values = response.headers["set-cookie"];
    assert(Array.isArray(values) && values.length >= 2, "access and refresh cookies are returned");
    assert(
      values.every((value) => /HttpOnly/i.test(value)),
      "authentication cookies are HttpOnly",
    );

    return values.map((value) => value.split(";")[0]).join("; ");
  }

  try {
    const pgPort = await container(
      "postgres",
      composeImage("postgres"),
      5432,
      {
        POSTGRES_USER: "integration",
        POSTGRES_PASSWORD: "integration-only",
        POSTGRES_DB: "integration",
      },
      ["pg_isready", "-U", "integration", "-d", "integration"],
    );

    const redisPort = await container("redis", composeImage("redis"), 6379, {}, [
      "redis-cli",
      "ping",
    ]);

    Object.assign(process.env, {
      NODE_ENV: "test",
      DB_HOST: "127.0.0.1",
      DB_PORT: String(pgPort),
      DB_NAME: "integration",
      DB_USER: "integration",
      DB_PASSWORD: "integration-only",
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: String(redisPort),
      JWT_KEY: "integration-only-key-never-for-production",
      PANDASCORE_API_TOKEN: "integration-not-a-real-token",
      GOOGLE_CLIENT_ID: "integration",
      GOOGLE_CLIENT_SECRET: "",
      GOOGLE_REDIRECT_URI: "http://127.0.0.1/auth/google/callback",
      FRONT_URL: "http://127.0.0.1:4000",
      ADMIN_URL: "http://127.0.0.1:4002",
    });
    await import("reflect-metadata");
    const { initLogger } = await import("evlog");
    initLogger({
      env: { service: "backend-integration", environment: "test" },
    });
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { MikroORM } = await import("@mikro-orm/postgresql");
    const { SchedulerRegistry } = await import("@nestjs/schedule");
    const { RequestContext, TransactionContext } = await import("@mikro-orm/core");
    const { AppModule } = await import("../src/app.module.ts");
    const { configureApp } = await import("../src/configure-app.ts");

    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      logger: false,
      abortOnError: false,
    });

    application = app;
    await configureApp(app, ["http://127.0.0.1:4000", "http://127.0.0.1:4002"]);
    const orm = app.get(MikroORM);
    const { default: Redis } = await import("ioredis");
    const redis = new Redis({ host: "127.0.0.1", port: redisPort });
    redisClient = redis;

    const request: Request = async (method, url, payload, cookie, status = 200, headers = {}) => {
      const requestHeaders = { ...headers };

      if (cookie !== undefined) requestHeaders.cookie = cookie;

      const response = await app.inject({
        method,
        url,
        payload,
        remoteAddress: "127.0.0.1",
        headers: requestHeaders,
      });

      assert.equal(response.statusCode, status, `${method} ${url}: ${response.body}`);

      return Object.assign(response, {
        json: <T,>(schema: z.ZodType<T>): T => {
          const body: unknown = JSON.parse(response.body);

          return schema.parse(body);
        },
      });
    };

    const { User } = await import("../src/user/infrastructure/persistence/user.entity.ts");
    const rosterRows = await import("../src/roster/infrastructure/persistence/player.entities.ts");

    const { Reply, ReplyReport } =
      await import("../src/reply/infrastructure/persistence/reply.entities.ts");

    const { ReplyNotification } =
      await import("../src/notification/infrastructure/persistence/reply-notification.entity.ts");

    const { PersonalAccessToken } =
      await import("../src/pat/infrastructure/persistence/personal-access-token.entity.ts");

    const { PickemChoice } =
      await import("../src/game/pickem/infrastructure/persistence/pickem.entity.ts");

    const { PatService } = await import("../src/pat/application/pat.service.ts");

    const { AirRiddle } =
      await import("../src/game/airriddle/infrastructure/persistence/airriddle.entity.ts");

    await check(
      "MikroORM migrations rebuild PostgreSQL with no pending schema changes",
      async () => {
        orm.config.set("migrations", {
          ...orm.config.get("migrations"),
          path: resolve(root, "dist/infrastructure/database/migrations"),
          pathTs: undefined,
          emit: "js",
          snapshot: false,
        });
        const migrator = orm.migrator;
        const pending = await migrator.getPending();
        assert(pending.length > 0, "the fresh database has migrations to apply");
        const applied = await migrator.up();
        assert.equal(applied.length, pending.length);
        assert.deepEqual(await migrator.getPending(), []);
        assert.equal(await migrator.checkSchema(), false);
        assert.equal((await orm.schema.getUpdateSchemaSQL()).trim(), "");
        assert.deepEqual(await migrator.up(), []);
      },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    for (const job of app.get(SchedulerRegistry).getCronJobs().values()) void job.stop();

    let staffCookie: string;
    let memberCookie: string;
    let staff: UserBody;
    let member: UserBody;
    await check(
      "HTTP signup, login, refresh, safe profile mapping and staff authorization",
      async () => {
        const signup = async (email: string, userName: string): Promise<string> =>
          cookies(
            await request("POST", "/auth/signup", {
              email,
              userName,
              password: "integration-password",
            }),
          );

        staffCookie = await signup("staff@example.test", "Integration Staff");
        memberCookie = await signup("member@example.test", "Integration Member");
        staff = (await request("GET", "/user/profile", undefined, staffCookie)).json(
          z.object({ user: userBody }),
        ).user;
        member = (await request("GET", "/user/profile", undefined, memberCookie)).json(
          z.object({ user: userBody }),
        ).user;
        assert(!("password" in staff) && !("googleId" in staff));
        await request("GET", "/user/profile", undefined, undefined, 401);
        await request("POST", "/team", { name: "Forbidden" }, memberCookie, 403);
        await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "admin" });
        staffCookie = cookies(
          await request("POST", "/auth/login", {
            email: "staff@example.test",
            password: "integration-password",
          }),
        );
        cookies(await request("POST", "/auth/refresh", undefined, staffCookie));
        await request(
          "POST",
          "/auth/login",
          { email: "staff@example.test", password: "incorrect" },
          undefined,
          401,
        );
        await request("POST", "/team", { name: "Invalid", unexpected: true }, staffCookie, 400);

        const patched = (
          await request("PATCH", "/user/profile", { userName: "Integration Renamed" }, memberCookie)
        ).json(z.object({ user: userBody }));

        assert.equal(patched.user.userName, "Integration Renamed");
      },
    );

    let article: ArticleBody;
    await check("news draft privacy, publication, French content and sitemap", async () => {
      article = (
        await request(
          "POST",
          "/news",
          {
            title: "Integration News",
            content: "<p>Published report</p>",
            titleFr: "Actualité intégration",
            contentFr: "<p>Rapport français</p>",
          },
          staffCookie,
          201,
        )
      ).json(articleBody);
      await request("GET", `/news/${article.slug}`, undefined, undefined, 404);
      assert.equal(
        (await request("GET", `/news/admin/${article.slug}`, undefined, staffCookie)).json(
          z.object({ isDraft: z.boolean() }),
        ).isDraft,
        true,
      );
      await request("PATCH", `/news/${article.slug}/publish`, {}, staffCookie, 204);
      assert.equal(
        (await request("GET", `/news/${article.slug}?locale=fr-FR`)).json(articleBody).title,
        "Actualité intégration",
      );

      const draft = (
        await request(
          "POST",
          "/news",
          { title: "Integration Secret Draft", content: "<p>Not public</p>" },
          staffCookie,
          201,
        )
      ).json(articleBody);

      await request("GET", `/news/${draft.slug}`, undefined, undefined, 404);
      assert.deepEqual(
        (await request("GET", "/sitemap/news")).json(z.array(pathEntry)).map(({ path }) => path),
        [`/news/${article.slug}`],
      );

      const feed = (await request("GET", "/news?locale=en-US&page=0&limit=10")).json(
        z.intersection(counted, z.object({ data: z.array(articleBody) })),
      );

      assert.equal(feed.total, 1);
      assert.deepEqual(
        feed.data.map(({ slug }) => slug),
        [article.slug],
      );
      assert.equal(
        (await request("GET", "/news?type=short&page=0&limit=10")).json(counted).total,
        1,
      );
      assert.equal(
        (await request("GET", "/news?type=article&page=0&limit=10")).json(counted).total,
        0,
      );
      assert.equal(
        (await request("GET", "/news/admin?page=0&limit=10", undefined, staffCookie)).json(counted)
          .total,
        2,
      );
      await request("PATCH", `/news/${article.slug}/unpublish`, {}, staffCookie, 204);
      assert.deepEqual((await request("GET", "/sitemap/news")).json(z.array(pathEntry)), []);
      assert.equal(
        (await request("GET", "/news?locale=en-US&page=0&limit=10")).json(counted).total,
        0,
      );
      await request("PATCH", `/news/${article.slug}/publish`, {}, staffCookie, 204);
    });

    let team: TeamBody;
    let otherTeam: TeamBody;
    let player: PlayerBody;
    await check("teams, players, roster contracts and profile photo selection", async () => {
      team = (await request("POST", "/team", { name: "Integration Alpha" }, staffCookie, 201)).json(
        z.object({ team: teamBody }),
      ).team;
      otherTeam = (
        await request("POST", "/team", { name: "Integration Beta" }, staffCookie, 201)
      ).json(z.object({ team: teamBody })).team;
      player = (
        await request(
          "POST",
          "/player",
          {
            name: "Integration Player",
            teamId: team.id,
            nationality: "FR",
            imageUrl: "https://example.test/original.jpg",
          },
          staffCookie,
          201,
        )
      ).json(z.object({ player: playerBody })).player;
      assert.equal(
        (await request("GET", `/player/${player.id}`)).json(
          z.object({ player: z.object({ team: identified }) }),
        ).player.team.id,
        team.id,
      );

      const photo = (
        await request(
          "POST",
          `/player/${player.id}/photo`,
          { url: "https://example.test/profile.jpg" },
          staffCookie,
          201,
        )
      ).json(z.object({ photo: photoBody })).photo;

      assert.equal(
        (
          await request(
            "PATCH",
            `/player/${player.id}/photo/${photo.id}/set-profile`,
            {},
            staffCookie,
          )
        ).json(z.object({ player: z.object({ imageUrl: z.string() }) })).player.imageUrl,
        photo.url,
      );
      assert.equal(
        (await request("GET", `/player/slug/${player.slug}`))
          .json(z.object({ player: z.object({ photos: z.array(z.string()) }) }))
          .player.photos.includes("https://example.test/original.jpg"),
        true,
      );

      const contract = (
        await request(
          "POST",
          `/player/${player.id}/contract`,
          { teamId: team.id, startDate: "2026-01-01" },
          staffCookie,
          201,
        )
      ).json(z.object({ contract: contractBody })).contract;

      assert.equal(contract.team.id, team.id);
      assert.equal(
        (await request("GET", `/team/${team.id}/contract`)).json(
          z.object({ contracts: z.array(contractBody) }),
        ).contracts.length,
        1,
      );
      assert.equal(
        (await request("GET", `/team/${team.id}`)).json(
          z.object({ team: z.object({ players: z.array(identified) }) }),
        ).team.players[0].id,
        player.id,
      );

      await request(
        "POST",
        `/player/${player.id}/contract`,
        { teamId: otherTeam.id, startDate: "2025-03-01", endDate: "2025-12-31", role: "benched" },
        staffCookie,
        201,
      );

      const movements = async (query: string): Promise<string[][]> =>
        (await request("GET", `/transfers?${query}`))
          .json(z.object({ transfers: z.array(transferBody) }))
          .transfers.map(({ type, date, team: { slug } }) => [type, date, slug]);

      assert.deepEqual(await movements(`player=${player.slug}`), [
        ["arrival", "2026-01-01", team.slug],
        ["departure", "2025-12-31", otherTeam.slug],
        ["benched", "2025-03-01", otherTeam.slug],
      ]);
      assert.deepEqual(await movements(`team=${otherTeam.slug}&from=2025-06-01&to=2025-12-31`), [
        ["departure", "2025-12-31", otherTeam.slug],
      ]);
      assert.deepEqual(await movements(`team=${team.slug}&type=departure`), []);
    });

    let tournament: TournamentBody;
    let match: MatchBody;
    await check(
      "manual tournament, real Redis DTO cache and TTL, match creation and reads",
      async () => {
        tournament = (
          await request(
            "POST",
            "/tournaments",
            { name: "Integration Cup", teamIds: [team.id, otherTeam.id] },
            staffCookie,
            201,
          )
        ).json(z.object({ tournament: tournamentBody })).tournament;
        assert.equal(tournament.source, "manual");
        assert.equal(tournament.participants.length, 2);
        await request(
          "POST",
          `/tournaments/${tournament.id}/enable-pickems`,
          { enabled: true },
          staffCookie,
          201,
        );
        match = (
          await request(
            "POST",
            `/tournaments/${tournament.id}/matches`,
            {
              name: "Integration Final",
              participantIds: tournament.participants.map((p) => p.id),
              beginAt: new Date(Date.now() + 86_400_000).toISOString(),
              status: "not_started",
            },
            staffCookie,
            201,
          )
        ).json(z.object({ match: matchBody })).match;
        assert(match.id);
        assert(
          Number.isInteger(match.publicId) && match.publicId > 0,
          "created match has a public id",
        );
        assert.equal(match.slug, "integration-alpha-vs-integration-beta-integration-cup");

        const byLegacyId = (await request("GET", `/matches/${match.id}`)).json(
          z.object({ match: matchBody }),
        );

        const byPublicId = (await request("GET", `/matches/${match.publicId}`)).json(
          z.object({ match: matchBody }),
        );

        assert.deepEqual(byPublicId.match, byLegacyId.match);
        assert.equal(byPublicId.match.id, match.id);
        assert.equal(byPublicId.match.publicId, match.publicId);
        assert.equal(byPublicId.match.slug, match.slug);
        await request("GET", `/matches/${match.publicId + 1000}`, undefined, undefined, 404);
        await request("GET", "/matches/not-a-match", undefined, undefined, 404);
        await request("GET", "/matches/upcoming?limit=abc", undefined, undefined, 400);
        await request("GET", "/matches/results?offset=-1", undefined, undefined, 400);

        const listed = (
          await request("GET", `/matches/upcoming?tournamentId=${tournament.id}`)
        ).json(z.object({ upcoming: z.array(matchBody) }));

        assert.equal(listed.upcoming[0].publicId, match.publicId);
        assert.equal(listed.upcoming[0].slug, match.slug);
        assert.equal(
          (await request("GET", `/matches/upcoming?tournamentId=${tournament.id}`)).json(counted)
            .total,
          1,
        );

        const firstBody = (await request("GET", `/tournaments/${tournament.id}`)).json(z.unknown());

        const first = z
          .object({
            tournament: z.object({
              matches: z.array(z.object({ beginAt: z.string() })),
              participants: z.array(participantBody),
            }),
          })
          .parse(firstBody);

        const second = (await request("GET", `/tournaments/${tournament.id}`)).json(z.unknown());
        assert.deepEqual(firstBody, second);
        assert.match(first.tournament.matches[0].beginAt, /^\d{4}-\d{2}-\d{2}T/);
        assert.equal(first.tournament.participants[0].team.id, tournament.participants[0].team.id);
        const ttl = await redis.ttl(`tournament:${tournament.id}`);
        assert(ttl > 0 && ttl <= 60, `cache TTL is seconds, observed ${ttl}`);
        await request(
          "PATCH",
          `/tournaments/${tournament.id}`,
          { name: "Integration Cup Updated" },
          staffCookie,
        );
        assert.equal(await redis.exists(`tournament:${tournament.id}`), 0);
        assert.equal(
          (await request("GET", `/tournaments/${tournament.id}`)).json(
            z.object({ tournament: z.object({ name: z.string() }) }),
          ).tournament.name,
          "Integration Cup Updated",
        );
        const { RedisService } = await import("../src/infrastructure/redis/redis.service.ts");
        await app.get(RedisService).set("integration:expires", "value", 1);
        assert.equal(await redis.get("integration:expires"), "value");
        const expiresInMs = await redis.pttl("integration:expires");
        assert.ok(
          expiresInMs > 0 && expiresInMs <= 1000,
          `expected a 1 s expiry, got ${expiresInMs} ms`,
        );
      },
    );

    await check(
      "article match blocks scope matches to a team through its participations",
      async () => {
        const [index] = await orm.em
          .getConnection()
          .execute<{ indexdef: string }[]>(
            `select indexdef from pg_indexes where indexname = 'tournament_participant_team_id_index'`,
          );

        assert.match(index.indexdef, /(team_id)/);

        const keys = [
          `team:${team.id}:1`,
          `team:${otherTeam.id}:5`,
          `tournament:${tournament.id}:5`,
          "team:00000000-0000-4000-8000-000000000000:5",
        ];

        const { blocks } = (
          await request("GET", `/matches/blocks?${keys.map((key) => `block=${key}`).join("&")}`)
        ).json(
          z.object({
            blocks: z.record(z.string(), z.array(z.object({ id: z.string(), state: z.string() }))),
          }),
        );

        for (const key of keys.slice(0, 3)) {
          assert.deepEqual(
            blocks[key].map((item) => [item.id, item.state]),
            [[match.id, "upcoming"]],
            key,
          );
        }

        assert.deepEqual(blocks[keys[3]], []);
      },
    );

    await check("per-game VOD links persist as validated jsonb on the match", async () => {
      const vods = [
        { game: 2, url: "https://youtu.be/second?t=1h2m3s", language: "FR" },
        { game: 1, url: "https://www.twitch.tv/videos/1?t=95", language: "en" },
        { game: 1, url: "https://www.twitch.tv/videos/1?t=95", language: "en" },
      ];

      await request("PUT", `/tournaments/matches/${match.id}/vods`, { vods }, memberCookie, 403);

      const saved = (
        await request("PUT", `/tournaments/matches/${match.id}/vods`, { vods }, staffCookie)
      ).json(z.object({ match: z.object({ vods: z.array(vodBody) }) })).match.vods;

      const expected = [
        { game: 1, url: "https://www.twitch.tv/videos/1?t=95", language: "en", source: "twitch" },
        { game: 2, url: "https://youtu.be/second?t=1h2m3s", language: "fr", source: "youtube" },
      ];

      assert.deepEqual(saved, expected);
      assert.deepEqual(
        (await request("GET", `/matches/${match.publicId}`)).json(
          z.object({ match: z.object({ vods: z.array(vodBody) }) }),
        ).match.vods,
        expected,
      );

      const [row] = await orm.em
        .getConnection()
        .execute<{ vods: VodBody[] }[]>(`select vods from "match" where id = ?`, [match.id]);

      assert.deepEqual(row.vods, expected);
      await request(
        "PUT",
        `/tournaments/matches/${match.id}/vods`,
        { vods: [{ game: 1, url: "http://youtu.be/x", language: "en" }] },
        staffCookie,
        400,
      );
      assert.deepEqual(
        (await request("GET", `/matches/${match.id}`)).json(
          z.object({ match: z.object({ vods: z.array(vodBody) }) }),
        ).match.vods,
        expected,
      );
      await request(
        "PUT",
        `/tournaments/matches/00000000-0000-4000-8000-000000000000/vods`,
        { vods: [] },
        staffCookie,
        404,
      );

      const token = (
        await request("POST", "/pat/tokens", { name: "VOD MCP" }, staffCookie, 201)
      ).json(tokenBody);

      const setGameVods = async (game: number) =>
        await request(
          "POST",
          "/mcp",
          {
            jsonrpc: "2.0",
            id: game,
            method: "tools/call",
            params: {
              name: "set_match_game_vods",
              arguments: {
                matchId: match.id,
                game,
                links: [{ url: `https://youtu.be/game${game}`, language: "en" }],
              },
            },
          },
          undefined,
          200,
          {
            authorization: `Bearer ${token.token}`,
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
          },
        );

      await Promise.all([3, 4, 5].map(setGameVods));
      assert.deepEqual(
        (await request("GET", `/matches/${match.id}`))
          .json(z.object({ match: z.object({ vods: z.array(vodBody) }) }))
          .match.vods.map((vod) => vod.game),
        [1, 2, 3, 4, 5],
      );
      await request("DELETE", `/pat/tokens/${token.id}`, undefined, staffCookie, 204);
    });

    await check(
      "watch streams inherit from event to tournament to match and a match override replaces them",
      async () => {
        await verifyStreams({ request, staffCookie, memberCookie, tournament, match });
      },
    );

    let lineupFixtures: Awaited<ReturnType<typeof verifyLineups>>;
    await check(
      "series lineups replace per match, flag stand-ins and keep start.gg lineups on the site",
      async () => {
        lineupFixtures = await verifyLineups({
          request,
          staffCookie,
          memberCookie,
          tournament,
          match,
          player,
        });
      },
    );
    await check("staff enter credited viewership on matches and events", async () => {
      await verifyViewership({ request, staffCookie, memberCookie, tournament, match });
    });

    let aliasFixtures: Awaited<ReturnType<typeof verifyTeamAliases>>;
    await check(
      "dated team aliases name past stages and matches, feed search and refuse Liquipedia",
      async () => {
        aliasFixtures = await verifyTeamAliases({ request, staffCookie, memberCookie });
      },
    );

    await check("tournament events: list, event and stage paths, legacy ids and 404s", async () => {
      assert.equal(tournament.slug, "integration-cup");
      assert.deepEqual(
        { slug: tournament.event.slug, name: tournament.event.name },
        { slug: "integration-cup", name: "Integration Cup" },
      );
      const listed = (await request("GET", "/events?limit=100")).json(eventList);
      const listedEvent = listed.events.find((event) => event.id === tournament.event.id);
      assert(listedEvent, "the manual tournament is listed as an event");
      assert(listed.count >= 1);
      assert.equal(listedEvent.name, "Integration Cup Updated");
      assert.deepEqual(
        listedEvent.stages.map((stage) => [stage.id, stage.matches]),
        [[tournament.id, undefined]],
      );
      const pickems = (await request("GET", "/events?pickems=false&limit=100")).json(eventList);
      assert(!pickems.events.some((event) => event.id === tournament.event.id));
      const active = (await request("GET", "/events?activeOnly=true&limit=100")).json(eventList);
      assert(active.events.some((event) => event.id === tournament.event.id));

      const event = (await request("GET", "/events/resolve/Integration-Cup")).json(
        z.object({
          kind: z.string(),
          event: z.object({
            slug: z.string(),
            stages: z.array(z.object({ id: z.string(), matches: z.array(identified) })),
          }),
        }),
      );

      assert.equal(event.kind, "event");
      assert.equal(event.event.slug, "integration-cup");
      assert.equal(event.event.stages[0].id, tournament.id);
      assert.equal(event.event.stages[0].matches[0].id, match.id);

      const stage = (await request("GET", "/events/resolve/integration-cup/integration-cup")).json(
        resolvedStage,
      );

      assert.deepEqual(
        [stage.kind, stage.tab, stage.tournament.id],
        ["stage", "overview", tournament.id],
      );

      const legacy = (await request("GET", `/events/resolve/${tournament.id}`)).json(
        z.intersection(
          resolvedStage,
          z.object({
            tournament: z.object({
              slug: z.string(),
              event: z.object({ slug: z.string() }),
            }),
          }),
        ),
      );

      assert.deepEqual(
        [legacy.kind, legacy.tab, legacy.tournament.event.slug, legacy.tournament.slug],
        ["stage", "overview", "integration-cup", "integration-cup"],
      );

      const legacyMatches = (await request("GET", `/events/resolve/${tournament.id}/matches`)).json(
        resolvedStage,
      );

      assert.equal(legacyMatches.tab, "matches");

      for (const path of [
        "/events/resolve/no-such-event",
        "/events/resolve/integration-cup/no-such-stage",
        `/events/resolve/${tournament.id}/overview`,
        "/events/resolve/7d4c1a52-3c1f-4f0e-8a7b-9e0d1c2b3a4f",
      ])
        await request("GET", path, undefined, undefined, 404);

      await request(
        "POST",
        "/tournaments",
        { name: "Integration Clash", slug: "integration-cup" },
        staffCookie,
        409,
      );

      const generated = (
        await request("POST", "/tournaments", { name: "Integration Cup" }, staffCookie, 201)
      ).json(z.object({ tournament: tournamentBody })).tournament;

      assert.equal(generated.event.slug, "integration-cup-2");

      const renamed = (
        await request(
          "PATCH",
          `/tournaments/${generated.id}`,
          { slug: "integration-cup-replay" },
          staffCookie,
        )
      ).json(z.object({ tournament: tournamentBody })).tournament;

      assert.deepEqual(
        [renamed.slug, renamed.event.slug],
        ["integration-cup", "integration-cup-replay"],
      );
      await request("GET", "/events/resolve/integration-cup-2", undefined, undefined, 404);
    });

    await check(
      "concurrent picks preserve unique user/match and scoring is idempotent",
      async () => {
        const participantId = tournament.participants[0].id;
        await Promise.all(
          Array.from(
            { length: 4 },
            async () =>
              await request(
                "POST",
                `/pickem/match/${match.id}/pick`,
                { pickedParticipantId: participantId },
                memberCookie,
                201,
              ),
          ),
        );
        assert.equal(
          await orm.em.fork().count(PickemChoice, {
            user: { id: member.id },
            match: { id: match.id },
          }),
          1,
        );
        await request(
          "PUT",
          `/tournaments/matches/${match.id}/winner`,
          { winnerId: participantId },
          staffCookie,
        );
        await request("POST", `/pickem/matches/${match.id}/validate`, {}, staffCookie, 201);
        assert.equal(
          (
            await request("POST", `/pickem/matches/${match.id}/validate`, {}, staffCookie, 201)
          ).json(z.object({ updated: z.number() })).updated,
          0,
        );

        const picks = (
          await request(
            "GET",
            `/pickem/tournament/${tournament.id}/user/picks`,
            undefined,
            memberCookie,
          )
        ).json(
          z.object({
            picks: z.array(z.object({ points: z.number(), scored: z.boolean() })),
          }),
        ).picks;

        assert.equal(picks.length, 1);
        assert.equal(picks[0].points, 5);
        assert.equal(picks[0].scored, true);
        assert.equal(
          (await request("GET", `/pickem/tournament/${tournament.id}/leaderboard`)).json(
            z.object({ leaderboard: z.array(z.object({ points: z.number() })) }),
          ).leaderboard[0].points,
          5,
        );
        await request(
          "POST",
          `/pickem/match/${match.id}/pick`,
          { pickedParticipantId: participantId },
          memberCookie,
          400,
        );
      },
    );

    let rootReply: ReplyBody;
    let childReply: ReplyBody;
    await check(
      "comment threads, direct reply notifications, reporting and cascading deletion",
      async () => {
        rootReply = (
          await request(
            "POST",
            "/replies",
            { content: "Root comment", newsArticleId: article.id },
            staffCookie,
            201,
          )
        ).json(z.object({ reply: replyBody })).reply;
        childReply = (
          await request(
            "POST",
            "/replies",
            {
              content: "A reply",
              newsArticleId: article.id,
              replyToId: rootReply.id,
            },
            memberCookie,
            201,
          )
        ).json(z.object({ reply: replyBody })).reply;

        const thread = (
          await request(
            "GET",
            `/replies?targetType=newsArticle&targetId=${article.id}&page=0&limit=10`,
          )
        ).json(
          z.intersection(
            counted,
            z.object({ replies: z.array(z.object({ replies: z.array(replyBody) })) }),
          ),
        );

        assert.equal(thread.total, 1);
        assert.equal(thread.replies[0].replies[0].id, childReply.id);
        assert.equal(
          (await request("GET", "/notifications/unread-count", undefined, staffCookie)).json(
            z.object({ count: z.number() }),
          ).count,
          1,
        );

        const notifications = (await request("GET", "/notifications", undefined, staffCookie)).json(
          z.object({ notifications: z.array(notificationBody) }),
        ).notifications;

        assert.equal(notifications.length, 1);
        await request("PATCH", "/notifications/read", { ids: [notifications[0].id] }, staffCookie);
        assert.equal(
          (await request("GET", "/notifications/unread-count", undefined, staffCookie)).json(
            z.object({ count: z.number() }),
          ).count,
          0,
        );
        await request(
          "POST",
          `/replies/${rootReply.id}/report`,
          { reason: "spam" },
          memberCookie,
          201,
        );
        await request(
          "POST",
          `/replies/${rootReply.id}/report`,
          { reason: "spam" },
          memberCookie,
          409,
        );
        await request("GET", "/moderation/replies", undefined, memberCookie, 403);
        await request("GET", "/moderation/replies", undefined, staffCookie);
        await request("DELETE", `/replies/${rootReply.id}`, undefined, staffCookie, 204);
        assert.equal(
          await orm.em.fork().count(Reply, { id: { $in: [rootReply.id, childReply.id] } }),
          0,
        );
        assert.equal(await orm.em.fork().count(ReplyNotification, {}), 0);
        assert.equal(await orm.em.fork().count(ReplyReport, {}), 0);
      },
    );

    await check(
      "match and forum post comments link notifications and moderation to canonical paths",
      async () => {
        const postId = randomUUID();

        const topics = (await request("GET", "/forum")).json(
          z.object({ topics: z.array(identified) }),
        ).topics;

        const post = (
          await request(
            "POST",
            "/posts",
            {
              id: postId,
              title: "Linked Discussion",
              content: "Body",
              topicId: topics[0].id,
            },
            memberCookie,
            201,
          )
        ).json(z.object({ publicId: z.number() }));

        const renamed = (await request("GET", `/matches/${match.publicId}`)).json(
          z.object({ match: matchBody }),
        ).match;

        const targets = [
          {
            body: { matchId: match.id },
            path: `/matches/${renamed.publicId}/${renamed.slug}`,
          },
          {
            body: { postId },
            path: `/forum/post/${post.publicId}/linked-discussion`,
          },
        ];

        for (const { body, path } of targets) {
          const root = (
            await request("POST", "/replies", { content: "Root", ...body }, staffCookie, 201)
          ).json(z.object({ reply: replyBody })).reply;

          await request(
            "POST",
            "/replies",
            { content: "Answer", ...body, replyToId: root.id },
            memberCookie,
            201,
          );

          const notifications = (
            await request("GET", "/notifications", undefined, staffCookie)
          ).json(z.object({ notifications: z.array(notificationBody) })).notifications;

          assert.equal(notifications[0].targetPath, path);
          await request("PATCH", "/notifications/read", {}, staffCookie);
          await request(
            "POST",
            `/replies/${root.id}/report`,
            { reason: "spam" },
            memberCookie,
            201,
          );

          const moderated = (
            await request("GET", "/moderation/replies", undefined, staffCookie)
          ).json(z.union([z.array(replyBody), z.object({ replies: z.array(replyBody) })]));

          const reported = (Array.isArray(moderated) ? moderated : moderated.replies).find(
            (reply) => reply.id === root.id,
          );

          assert(reported, "the reported reply is moderated");
          assert.equal(reported.targetPath, path);
          await request("DELETE", `/replies/${root.id}`, undefined, staffCookie, 204);
        }

        await request("DELETE", `/posts/${postId}`, undefined, staffCookie, 204);
      },
    );

    await check(
      "real reply + notification transaction rolls back both flushed writes",
      async () => {
        const { transactionalReplies } = await import("../src/reply/infrastructure/composition.ts");
        const em = orm.em.fork();
        const id = randomUUID();
        const failure = new Error("injected after second SQL write");
        await assert.rejects(
          async () =>
            await RequestContext.create(
              em,
              async () =>
                await transactionalReplies(em).run(async (scope) => {
                  await scope.replies.save({
                    id,
                    content: "Must roll back",
                    createdAt: new Date(),
                    hiddenAt: null,
                    author: { id: member.id, userName: member.userName },
                    post: null,
                    newsArticle: {
                      id: article.id,
                      title: article.title,
                      slug: article.slug,
                    },
                    match: null,
                    replyTo: null,
                  });
                  await scope.notifications.createForDirectReply(staff.id, id);
                  const tx = TransactionContext.getEntityManager();
                  assert(tx, "the adapter provides a real transaction context");
                  await tx.flush();
                  assert.equal(await tx.count(Reply, { id }), 1);
                  assert.equal(await tx.count(ReplyNotification, { reply: { id } }), 1);
                  throw failure;
                }),
            ),
          (error) => error === failure,
        );
        assert.equal(await orm.em.fork().count(Reply, { id }), 0);
        assert.equal(await orm.em.fork().count(ReplyNotification, { reply: { id } }), 0);
      },
    );

    await check(
      "notification SQL constraint failure rolls back an already inserted reply",
      async () => {
        const { transactionalReplies } = await import("../src/reply/infrastructure/composition.ts");
        const { ForeignKeyConstraintViolationException } = await import("@mikro-orm/core");
        const em = orm.em.fork();
        const id = randomUUID();
        await assert.rejects(
          async () =>
            await RequestContext.create(
              em,
              async () =>
                await transactionalReplies(em).run(async (scope) => {
                  const tx = TransactionContext.getEntityManager();
                  assert(tx, "the adapter provides a real transaction context");
                  await scope.replies.save({
                    id,
                    content: "Rolled back after SQL constraint",
                    createdAt: new Date(),
                    hiddenAt: null,
                    author: { id: member.id, userName: member.userName },
                    post: null,
                    newsArticle: {
                      id: article.id,
                      title: article.title,
                      slug: article.slug,
                    },
                    match: null,
                    replyTo: null,
                  });
                  await tx.flush();
                  assert.equal(
                    await tx.count(Reply, { id }),
                    1,
                    "first SQL insert happened before the failure",
                  );
                  await scope.notifications.createForDirectReply(randomUUID(), id);
                  await tx.flush();
                  assert.fail(
                    "the notification recipient foreign key must reject the second SQL write",
                  );
                }),
            ),
          (error) =>
            error instanceof ForeignKeyConstraintViolationException &&
            error.code === "23503" &&
            "constraint" in error &&
            error.constraint === "reply_notification_recipient_id_foreign",
        );
        assert.equal(await orm.em.fork().count(Reply, { id }), 0);
        assert.equal(await orm.em.fork().count(ReplyNotification, { reply: { id } }), 0);
      },
    );

    await check("real roster + photo transaction rolls back both flushed writes", async () => {
      const { MikroRosterTransaction } =
        await import("../src/roster/infrastructure/persistence/roster.store.ts");

      const { PlayerPhoto } = await import("../src/roster/domain/roster.ts");
      const em = orm.em.fork();

      const before = await em.findOneOrFail(rosterRows.Player, {
        id: player.id,
      });

      const original = before.imageUrl;
      const photo = new PlayerPhoto();
      const failure = new Error("injected after player and photo SQL writes");
      await assert.rejects(
        async () =>
          await RequestContext.create(
            em,
            async () =>
              await new MikroRosterTransaction(em).run(async (scope) => {
                const model = await scope.players.findById(player.id);
                assert(model, "the player exists");
                model.imageUrl = "https://example.test/rolled-back.jpg";
                await scope.players.save(model);
                photo.player = model;
                photo.url = "https://example.test/rollback-archive.jpg";
                await scope.photos.save(photo);
                const tx = TransactionContext.getEntityManager();
                assert(tx, "the adapter provides a real transaction context");
                await tx.flush();
                assert.equal(await tx.count(rosterRows.PlayerPhoto, { id: photo.id }), 1);
                assert.equal(
                  (await tx.findOneOrFail(rosterRows.Player, { id: player.id })).imageUrl,
                  model.imageUrl,
                );
                throw failure;
              }),
          ),
        (error) => error === failure,
      );
      assert.equal(await orm.em.fork().count(rosterRows.PlayerPhoto, { id: photo.id }), 0);
      assert.equal(
        (await orm.em.fork().findOneOrFail(rosterRows.Player, { id: player.id })).imageUrl,
        original,
      );
    });

    await check(
      "PAT secrets are hashed, use current roles, reject revoked tokens over HTTP",
      async () => {
        const token = (
          await request("POST", "/pat/tokens", { name: "Integration token" }, staffCookie, 201)
        ).json(tokenBody);

        const stored = await orm.em.fork().findOneOrFail(PersonalAccessToken, { id: token.id });
        assert.notEqual(stored.tokenHash, token.token);
        assert.equal(stored.tokenHash, createHash("sha256").update(token.token).digest("hex"));

        const listed = (await request("GET", "/pat/tokens", undefined, staffCookie)).json(
          z.object({ tokens: z.array(z.looseObject({ id: z.string() })) }),
        ).tokens;

        assert(!("tokenHash" in listed[0]) && !("token" in listed[0]));
        const patHeaders = { authorization: `Bearer ${token.token}` };
        await request("GET", "/mcp", undefined, undefined, 405, patHeaders);
        await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "journalist" });
        assert.equal(
          await RequestContext.create(
            orm.em.fork(),
            async () => await app.get(PatService).resolveUser(token.token),
          ).then((user) => user?.role),
          "journalist",
        );
        await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: null });
        await request("GET", "/mcp", undefined, undefined, 401, patHeaders);
        await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "admin" });
        await request("DELETE", `/pat/tokens/${token.id}`, undefined, staffCookie, 204);
        await request("GET", "/mcp", undefined, undefined, 401, patHeaders);
        await request("POST", "/pat/tokens", { name: "Denied" }, memberCookie, 403);
      },
    );

    await check("MCP roster proposals, approval, merges and start.gg sources", async () => {
      const token = (
        await request("POST", "/pat/tokens", { name: "Roster MCP" }, staffCookie, 201)
      ).json(tokenBody);

      let rpcId = 0;

      async function mcpResult(name: string, args: Payload): Promise<JsonValue> {
        const response = await request(
          "POST",
          "/mcp",
          {
            jsonrpc: "2.0",
            id: ++rpcId,
            method: "tools/call",
            params: { name, arguments: args },
          },
          undefined,
          200,
          {
            authorization: `Bearer ${token.token}`,
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
          },
        );

        const data = response.body.split("\n").find((line) => line.startsWith("data: "));

        const message = rpcMessage.parse(
          JSON.parse(data === undefined ? response.body : data.slice("data: ".length)),
        );

        if (message.error !== undefined) return { error: true };
        assert(message.result, "the MCP response carries a result");

        if (message.result.isError === true) return { error: true };
        const text = message.result.content?.[0]?.text;
        assert(text !== undefined, "the MCP result carries content");

        return jsonValue.parse(JSON.parse(text));
      }

      function callTool(name: string, args: Payload): Promise<ToolProposal>;
      function callTool<T>(name: string, args: Payload, schema: z.ZodType<T>): Promise<T>;

      async function callTool<T>(
        name: string,
        args: Payload,
        schema?: z.ZodType<T>,
      ): Promise<T | ToolProposal> {
        return (schema ?? toolProposal).parse(await mcpResult(name, args));
      }

      async function review(
        proposal: ToolProposal,
        action?: "approve" | "reject",
      ): Promise<ReviewedProposal>;
      async function review(
        proposal: ToolProposal,
        action: "approve" | "reject",
        refusedWith: number,
      ): Promise<undefined>;

      async function review(
        proposal: ToolProposal,
        action: "approve" | "reject" = "approve",
        refusedWith?: number,
      ): Promise<ReviewedProposal | undefined> {
        const response = await request(
          "POST",
          `/roster-proposals/${proposal.proposalId}/${action}`,
          undefined,
          staffCookie,
          refusedWith ?? 200,
        );

        if (refusedWith !== undefined) return undefined;

        return response.json(z.object({ proposal: reviewedProposal })).proposal;
      }

      const applied = async (tool: string, args: Payload): Promise<string> => {
        const proposal = await callTool(tool, args);
        assert.equal(proposal.status, "pending", `${tool} is queued`);
        const result = await review(proposal);
        assert.equal(result.status, "applied");
        assert(result.entityId !== null, `${tool} created an entity`);

        return result.entityId;
      };

      const source = "https://x.com/integration/status/1";

      const alpha = await applied("create_team", {
        name: "MCP Alpha",
        sourceUrl: source,
      });

      const beta = await applied("create_team", {
        name: "MCP Beta",
        sourceUrl: source,
      });

      const duplicate = await callTool("create_team", {
        name: "MCP Alpha",
        sourceUrl: source,
      });

      await review(duplicate, "approve", 409);

      const pending = (await request("GET", "/roster-proposals", undefined, staffCookie)).json(
        z.object({
          proposals: z.array(z.object({ id: z.string(), status: z.string() })),
          names: z.record(z.string(), z.string()),
        }),
      );

      assert.deepEqual(
        pending.proposals.map((proposal) => [proposal.id, proposal.status]),
        [[duplicate.proposalId, "pending"]],
      );
      assert.equal(pending.names[staff.id], "Integration Staff");
      await request("GET", "/roster-proposals", undefined, memberCookie, 403);
      assert.equal((await review(duplicate, "reject")).status, "rejected");
      await review(duplicate, "approve", 400);

      const created = await applied("create_player", {
        name: "MCP Roster Player",
        country: "FR",
        sourceUrl: source,
      });

      const move = (playerId: string, teamId: string, effectiveDate: string) => ({
        playerId,
        teamId,
        effectiveDate,
        sourceUrl: source,
      });

      const queued = await callTool("add_player_to_team", move(created, alpha, "2026-01-10"));
      const before = await orm.em.fork().findOneOrFail(rosterRows.Player, { id: created });
      assert.equal(before.team, null, "a pending proposal changes nothing");
      await review(queued);
      await applied("add_player_to_team", move(created, beta, "2026-10-23"));
      await applied("remove_player_from_team", {
        ...move(created, beta, "2026-10-24"),
        status: "retired",
      });

      const contracts = async (where: ContractWhere) =>
        (
          await orm.em.fork().find(rosterRows.Contract, where, {
            orderBy: { startDate: "asc" },
          })
        ).map((contract) => [
          contract.team.id,
          contract.joinSourceUrl,
          contract.endDate && new Date(contract.endDate).toISOString().slice(0, 10),
        ]);

      assert.deepEqual(await contracts({ player: created }), [
        [alpha, source, "2026-10-23"],
        [beta, source, "2026-10-24"],
      ]);
      assert.equal(
        (await orm.em.fork().findOneOrFail(rosterRows.Player, { id: created })).status,
        "retired",
      );
      await applied("update_team", {
        teamId: beta,
        active: false,
        sourceUrl: source,
      });
      const inactive = await callTool("add_player_to_team", move(created, beta, "2026-10-25"));
      await review(inactive, "approve", 400);
      await review(inactive, "reject");
      assert.deepEqual(await callTool("update_team", { teamId: beta, active: true }, toolFailure), {
        error: true,
      });

      const twin = await applied("create_player", {
        name: "MCP Roster Twin",
        sourceUrl: source,
      });

      await applied("add_player_to_team", move(twin, alpha, "2026-09-01"));
      await applied("add_player_to_team", move(created, alpha, "2026-10-25"));

      const mergePlayers = {
        keptPlayerId: created,
        duplicatePlayerId: twin,
        sourceUrl: source,
      };

      assert.equal(await applied("merge_players", mergePlayers), created);
      const twinRow = await orm.em.fork().findOneOrFail(rosterRows.Player, { id: twin });
      assert.equal(twinRow.mergedInto?.id, created);
      assert.deepEqual(await contracts({ player: twin }), []);
      assert.deepEqual(await contracts({ player: created }), [
        [alpha, source, "2026-10-23"],
        [alpha, source, null],
        [beta, source, "2026-10-24"],
      ]);

      const open = await orm.em.fork().findOneOrFail(rosterRows.Contract, {
        player: created,
        endDate: null,
      });

      assert.equal(new Date(open.startDate).toISOString().slice(0, 10), "2026-09-01");
      assert.equal(
        (await request("GET", `/player/${twin}/contract`)).json(
          z.object({ contracts: z.array(contractBody) }),
        ).contracts.length,
        3,
        "a merged id serves the kept player sub-resources",
      );

      const redirected = (await request("GET", "/player/slug/mcp-roster-twin")).json(
        z.object({ player: z.intersection(playerBody, z.object({ team: identified })) }),
      ).player;

      assert.equal(redirected.slug, "mcp-roster-player");
      assert.equal(redirected.team.id, alpha);
      assert.deepEqual(
        (await request("GET", "/player?name=MCP%20Roster"))
          .json(z.object({ players: z.array(identified) }))
          .players.map(({ id }) => id),
        [created],
      );
      assert.deepEqual(await callTool("merge_players", mergePlayers, toolFailure), {
        error: true,
      });

      await applied("merge_teams", {
        keptTeamId: alpha,
        duplicateTeamId: beta,
        sourceUrl: source,
      });
      assert.deepEqual(
        (await contracts({ player: created })).map(([teamId]) => teamId),
        [alpha, alpha, alpha],
      );
      assert.equal(
        (await request("GET", "/team/slug/mcp-beta")).json(z.object({ team: identified })).team.id,
        alpha,
      );
      assert.equal(await orm.em.fork().count(rosterRows.Team, { id: beta }), 1);

      const gamma = await applied("create_team", { name: "MCP Gamma", sourceUrl: source });

      const veteran = await applied("create_player", {
        name: "MCP Career Player",
        sourceUrl: source,
      });

      await applied("add_player_to_team", move(veteran, alpha, "2026-02-01"));

      const career = async () =>
        (
          await callTool(
            "list_contracts",
            { idOrSlug: veteran },
            z.object({ contracts: z.array(mcpContract) }),
          )
        ).contracts.map((contract) => [
          contract.team.id,
          contract.startDate,
          contract.endDate,
          contract.role,
          contract.leaveSourceUrl,
        ]);

      const stint = {
        playerId: veteran,
        teamId: gamma,
        startDate: "2024-01-01",
        endDate: "2025-12-31",
        role: "loaned",
        sourceUrl: "https://x.com/integration/status/2",
      };

      const stintId = await applied("create_contract", stint);
      assert.deepEqual(await career(), [
        [gamma, "2024-01-01", "2025-12-31", "loaned", stint.sourceUrl],
        [alpha, "2026-02-01", null, "active", null],
      ]);

      for (const invalid of [
        { ...stint, sourceUrl: "https://liquipedia.net/rocketleague/Zen" },
        { ...stint, endDate: "2023-12-31" },
        { ...stint, endDate: "2025-02-30" },
      ]) {
        assert.deepEqual(await callTool("create_contract", invalid, toolFailure), { error: true });
      }

      const conflicts: [Payload, number][] = [
        [{ ...stint, teamId: alpha, startDate: "2025-06-01", endDate: "2026-03-01" }, 422],
        [{ ...stint, startDate: "2026-03-01", endDate: undefined }, 400],
      ];

      for (const [conflicting, status] of conflicts) {
        const proposal = await callTool("create_contract", conflicting);
        await review(proposal, "approve", status);
        await review(proposal, "reject");
      }

      const correction = "https://x.com/integration/status/3";

      const revise = (changes: ContractChanges) => ({
        playerId: veteran,
        contractId: stintId,
        sourceUrl: correction,
        ...changes,
      });

      assert.equal(await applied("update_contract", revise({ endDate: "2025-11-30" })), stintId);
      assert.deepEqual((await career())[0], [
        gamma,
        "2024-01-01",
        "2025-11-30",
        "loaned",
        correction,
      ]);

      const currentId = (
        await callTool(
          "list_contracts",
          { idOrSlug: veteran },
          z.object({ contracts: z.array(mcpContract) }),
        )
      ).contracts[1].id;

      const invalidChanges: ContractChanges[] = [
        { endDate: null },
        { contractId: currentId, endDate: "2026-05-01" },
      ];

      for (const changes of invalidChanges) {
        const proposal = await callTool("update_contract", revise(changes));
        await review(proposal, "approve", 400);
        await review(proposal, "reject");
      }

      assert.deepEqual(
        await callTool(
          "update_contract",
          revise({ contractId: randomUUID(), role: "benched" }),
          toolFailure,
        ),
        { error: true },
      );
      await applied("add_player_to_team", {
        ...move(veteran, alpha, "2026-06-01"),
        role: "coach",
      });
      assert.deepEqual((await career()).slice(1), [
        [alpha, "2026-02-01", "2026-06-01", "active", source],
        [alpha, "2026-06-01", null, "coach", null],
      ]);

      const coach = await callTool(
        "get_player",
        {
          idOrSlug: veteran,
        },
        z.intersection(playerBody, z.object({ role: z.string() })),
      );

      assert.equal(coach.role, "coach");
      const staffMoves = await request("GET", `/transfers?player=${coach.slug}&type=staff`);
      assert.deepEqual(
        staffMoves
          .json(
            z.object({
              transfers: z.array(z.intersection(transferBody, z.object({ role: z.string() }))),
            }),
          )
          .transfers.map(({ type, date, role }) => [type, date, role]),
        [["staff", "2026-06-01", "coach"]],
      );

      const startgg = "https://www.start.gg/tournament/integration/event/main";

      const scoutProposal = await callTool("create_player", {
        name: "MCP Startgg Player",
        sourceUrl: startgg,
      });

      const pendingIds = async () =>
        (
          await callTool("list_roster_proposals", {}, z.object({ proposals: z.array(identified) }))
        ).proposals.map(({ id }) => id);

      assert.ok((await pendingIds()).includes(scoutProposal.proposalId));
      const scouted = (await review(scoutProposal)).entityId;
      assert.ok(!(await pendingIds()).includes(scoutProposal.proposalId));
      assert.equal(
        (await request("GET", "/player/slug/mcp-startgg-player")).json(
          z.object({ player: z.object({ source: z.string() }) }),
        ).player.source,
        "startgg",
      );
      assert.deepEqual(
        (await callTool("search_players", { query: "MCP Startgg" }, z.array(sourcedBody))).map(
          ({ id, source }) => [id, source],
        ),
        [[scouted, "startgg"]],
      );
      assert.equal(
        (await callTool("get_player", { idOrSlug: scouted }, sourcedBody)).source,
        "startgg",
      );
      assert.equal(
        (await callTool("search_players", { query: "MCP Roster" }, z.array(sourcedBody)))[0].id,
        created,
      );

      const scoutedTeam = await applied("create_team", {
        name: "MCP Startgg Team",
        sourceUrl: startgg,
      });

      assert.equal(
        (await callTool("search_teams", { query: "MCP Startgg" }, z.array(identified)))[0].id,
        scoutedTeam,
      );
      assert.equal(
        (await callTool("get_team", { idOrSlug: scoutedTeam }, sourcedBody)).source,
        "startgg",
      );

      const { TournamentParticipant: ParticipantRow } =
        await import("../src/tournament/infrastructure/competition-persistence.ts");

      const participantIds = async (tournamentId: string): Promise<string[]> =>
        (await orm.em.fork().find(ParticipantRow, { tournament: tournamentId })).map(
          ({ id }) => id,
        );

      const createCup = async <T,>(tournamentSource: string, schema: z.ZodType<T>): Promise<T> =>
        await callTool(
          "create_tournament",
          {
            name: `MCP ${tournamentSource} Cup`,
            beginAt: "2026-10-20",
            endAt: "2026-10-30",
            teamIds: [alpha, scoutedTeam],
            source: tournamentSource,
          },
          schema,
        );

      const teamNames = (participants: { team: { name: string } }[]): string[] =>
        participants.map(({ team }) => team.name).sort();

      const manualCreated = await createCup("manual", mcpCreatedTournament);
      const manualCup = manualCreated.id;
      assert.deepEqual(teamNames(manualCreated.participants), ["MCP Alpha", "MCP Startgg Team"]);

      for (const participant of manualCreated.participants) {
        assert.ok(participant.id);
        assert.ok(participant.team.slug);
        assert.ok(participant.team.id);
      }

      const detail = await callTool("get_tournament", { id: manualCup }, mcpTournament);
      assert.deepEqual(
        detail.participants
          .map(({ id, team }) => [id, team.id, team.slug, team.name])
          .sort(byJoined),
        manualCreated.participants
          .map(({ id, team }) => [id, team.id, team.slug, team.name])
          .sort(byJoined),
      );
      const slugs = detail.participants.map(({ team }) => team.slug);

      const bySlug = await callTool(
        "create_match",
        {
          tournamentId: manualCup,
          name: "MCP manual by slug",
          teams: slugs,
        },
        mcpMatch,
      );

      assert.deepEqual(
        bySlug.participants.map(({ id }) => id).sort(),
        detail.participants.map(({ id }) => id).sort(),
      );

      const byTeamId = await callTool(
        "create_match",
        {
          tournamentId: manualCup,
          name: "MCP manual by team id",
          teams: detail.participants.map(({ team }) => team.id),
        },
        mcpMatch,
      );

      assert.equal(byTeamId.participants.length, 2);

      const byParticipant = await callTool(
        "create_match",
        {
          tournamentId: manualCup,
          name: "MCP manual by participant",
          participantIds: detail.participants.map(({ id }) => id),
        },
        mcpMatch,
      );

      assert.equal(byParticipant.participants.length, 2);
      const betaTeam = await callTool("get_team", { idOrSlug: beta }, teamBody);
      assert.deepEqual(
        await callTool(
          "create_match",
          {
            tournamentId: manualCup,
            name: "MCP outsider",
            teams: [betaTeam.slug, slugs[0]],
          },
          toolFailure,
        ),
        { error: true },
      );
      assert.deepEqual(
        await callTool(
          "create_match",
          {
            tournamentId: manualCup,
            name: "MCP missing team",
            teams: ["not-a-team", slugs[0]],
          },
          toolFailure,
        ),
        { error: true },
      );

      const updated = await callTool(
        "update_tournament",
        {
          tournamentId: manualCup,
          teamIds: [alpha, scoutedTeam],
        },
        mcpCreatedTournament,
      );

      assert.deepEqual(
        updated.participants.map(({ team }) => team.id).sort(),
        [alpha, scoutedTeam].sort(),
      );

      const manualMatches = (await callTool("get_tournament", { id: manualCup }, mcpTournament))
        .matches;

      assert.equal(manualMatches.length, 3);

      for (const match of manualMatches) {
        assert.deepEqual(teamNames(match.participants), ["MCP Alpha", "MCP Startgg Team"]);
      }

      const startggCreated = await createCup("startgg", mcpLimitedTournament);
      const startggCup = startggCreated.id;
      assert.equal(startggCreated.participants, undefined);

      const startggMatch = await callTool(
        "create_match",
        {
          tournamentId: startggCup,
          name: "MCP startgg Final",
          participantIds: await participantIds(startggCup),
        },
        mcpLimitedMatch,
      );

      assert.ok(startggMatch.id);
      assert.equal(startggMatch.participants, undefined);

      const startggByTeam = await callTool(
        "create_match",
        {
          tournamentId: startggCup,
          name: "MCP startgg by team",
          teams: slugs,
        },
        mcpLimitedMatch,
      );

      assert.ok(startggByTeam.id);
      assert.equal(startggByTeam.participants, undefined);
      assert.deepEqual(await callTool("get_tournament", { id: startggCup }, toolFailure), {
        error: true,
      });

      const listed = (await callTool("get_tournaments", { limit: 100 }, z.array(identified))).map(
        ({ id }) => id,
      );

      assert.ok(listed.includes(manualCup));
      assert.ok(!listed.includes(startggCup));

      const results = await callTool(
        "get_match_results",
        {},
        z.intersection(counted, z.object({ results: z.array(identified) })),
      );

      assert.equal(
        results.total,
        results.results.length,
        "start.gg rows are excluded before counting",
      );

      const upcoming = await callTool(
        "get_upcoming_matches",
        {},
        z.intersection(
          counted,
          z.object({ upcoming: z.array(identified), live: z.array(identified) }),
        ),
      );

      assert.equal(upcoming.total, upcoming.upcoming.length + upcoming.live.length);
      assert.ok(Array.isArray(await callTool("get_tournaments", {}, z.array(z.unknown()))));
      await verifyStreamProposals({ request, staffCookie, callTool, review, tournament, match });
      await verifyLineupProposals({
        request,
        staffCookie,
        callTool,
        review,
        tournament,
        match,
        player,
        ...lineupFixtures,
      });
      await verifyViewershipProposals({
        request,
        staffCookie,
        callTool,
        review,
        match,
        startggCupId: startggCup,
        startggMatchId: startggMatch.id,
      });
      await verifyTeamAliasProposals({ request, callTool, review, ...aliasFixtures });
      await verifyCircuits({
        app,
        orm,
        RequestContext,
        request,
        staffCookie,
        memberCookie,
        callTool,
        review,
        tournament,
      });
      await verifySeasonAwards({ request, staffCookie, memberCookie, callTool, review, player });
      await verifySeasonArchives({
        request,
        staffCookie,
        memberCookie,
        team,
        otherTeam,
        tournament,
        startggCupId: startggCup,
      });
      await request("DELETE", `/pat/tokens/${token.id}`, undefined, staffCookie, 204);
    });

    await check("roster merges move every reference and release the PandaScore id", async () => {
      const { RosterMergeService } =
        await import("../src/roster/application/roster-merge.service.ts");

      const { ConflictError } = await import("../src/common/domain/errors.ts");

      const { TournamentParticipant, PlayerAward } =
        await import("../src/tournament/infrastructure/competition-persistence.ts");

      const merges = app.get(RosterMergeService);

      const merge = async <T,>(
        work: (service: InstanceType<typeof RosterMergeService>) => Promise<T>,
      ) => await RequestContext.create(orm.em.fork(), async () => await work(merges));

      const day = (value: Date | string | null | undefined) =>
        value === null || value === undefined ? value : new Date(value).toISOString().slice(0, 10);

      const slug = (name: string): string => name.toLowerCase().replaceAll(" ", "-");

      const insert = async (build: (em: ReturnType<typeof orm.em.fork>, id: string) => object) => {
        const em = orm.em.fork();
        const id = randomUUID();
        em.persist(build(em, id));
        await em.flush();

        return id;
      };

      const newTeam = async (name: string, props: { mergedInto?: string } = {}) =>
        await insert((em, id) =>
          em.create(rosterRows.Team, { id, name, slug: slug(name), ...props }, { partial: true }),
        );

      const newPlayer = async (
        name: string,
        props: { team?: string; pandascoreId?: number; mergedInto?: string } = {},
      ) =>
        await insert((em, id) =>
          em.create(rosterRows.Player, { id, name, slug: slug(name), ...props }, { partial: true }),
        );

      const newContract = async (
        player: string,
        team: string,
        startDate: string,
        endDate: string | null = null,
      ) =>
        await insert((em, id) =>
          em.create(
            rosterRows.Contract,
            {
              id,
              player,
              team,
              startDate: new Date(startDate),
              endDate: endDate === null ? null : new Date(endDate),
            },
            { partial: true },
          ),
        );

      const newPhoto = async (player: string, url: string) =>
        await insert((em, id) =>
          em.create(rosterRows.PlayerPhoto, { id, player, url }, { partial: true }),
        );

      const newCup = async (name: string, teamIds: string[]) => {
        const { id, participants } = (
          await request("POST", "/tournaments", { name, teamIds }, staffCookie, 201)
        ).json(z.object({ tournament: tournamentBody })).tournament;

        return {
          id,
          participantOf: (teamId: string): string => {
            const entry = participants.find((candidate) => candidate.team.id === teamId);
            assert(entry, "the team has a participant entry");

            return entry.id;
          },
        };
      };

      const addMembers = async (participantId: string, ...playerIds: string[]) => {
        const em = orm.em.fork();

        const participant = await em.findOneOrFail(
          TournamentParticipant,
          { id: participantId },
          { populate: ["players"] },
        );

        for (const id of playerIds) participant.players.add(em.getReference(rosterRows.Player, id));
        await em.flush();
      };

      const members = async (participantId: string) =>
        (
          await orm.em
            .fork()
            .findOneOrFail(TournamentParticipant, { id: participantId }, { populate: ["players"] })
        ).players
          .getItems()
          .map(({ id }) => id)
          .sort();

      const award = async (
        cup: Identified,
        participantId: string,
        playerId: string,
        awardType: string,
      ) =>
        await request(
          "POST",
          `/tournaments/${cup.id}/awards`,
          { participantId, playerId, awardType },
          staffCookie,
          201,
        );

      const awardsOf = async (player: string) =>
        (await orm.em.fork().find(PlayerAward, { player })).map((row) => row.awardType).sort();

      const photosOf = async (player: string) =>
        (await orm.em.fork().find(rosterRows.PlayerPhoto, { player })).map((row) => row.url).sort();

      const contractsOf = async (where: ContractWhere) =>
        (
          await orm.em.fork().find(rosterRows.Contract, where, { orderBy: { startDate: "asc" } })
        ).map((row) => [row.team.id, day(row.startDate), day(row.endDate)]);

      const playerRow = async (id: string) =>
        await orm.em.fork().findOneOrFail(rosterRows.Player, { id });

      const teamRow = async (id: string) =>
        await orm.em.fork().findOneOrFail(rosterRows.Team, { id });

      const redirectOf = async (entity: EntityClass<Mergeable>, id: string) =>
        (await orm.em.fork().findOneOrFail(entity, { id }, { populate: ["mergedInto"] })).mergedInto
          ?.id ?? null;

      const playerTeam = async (id: string) => {
        const row = await orm.em
          .fork()
          .findOneOrFail(rosterRows.Player, { id }, { populate: ["team"] });

        assert(row.team, "the player has a team");

        return row.team.id;
      };

      const participantTeam = async (id: string) => {
        const row = await orm.em
          .fork()
          .findOneOrFail(TournamentParticipant, { id }, { populate: ["team"] });

        assert(row.team, "the participant has a team");

        return row.team.id;
      };

      const alpha = await newTeam("Reference Alpha");
      const beta = await newTeam("Reference Beta");
      const kept = await newPlayer("Reference Kept", { team: alpha });

      const duplicate = await newPlayer("Reference Duplicate", {
        team: alpha,
        pandascoreId: 77001,
      });

      const redirected = await newPlayer("Reference Redirected", { mergedInto: duplicate });
      await newContract(kept, alpha, "2026-03-01");
      await newContract(duplicate, alpha, "2026-01-15");
      await newContract(duplicate, beta, "2024-01-01", "2024-12-31");
      await newPhoto(kept, "https://example.test/reference-kept.jpg");
      await newPhoto(duplicate, "https://example.test/reference-duplicate-1.jpg");
      await newPhoto(duplicate, "https://example.test/reference-duplicate-2.jpg");
      const soloCup = await newCup("Reference Solo Cup", [alpha, beta]);
      const sharedCup = await newCup("Reference Shared Cup", [alpha, beta]);
      const soloEntry = soloCup.participantOf(alpha);
      const sharedEntry = sharedCup.participantOf(alpha);
      await addMembers(soloEntry, duplicate);
      await addMembers(sharedEntry, kept, duplicate);
      await award(soloCup, soloEntry, duplicate, "mvp");
      await award(sharedCup, sharedEntry, duplicate, "defensive_mvp");

      const referenceSeason = (
        await request("POST", "/seasons", { name: "Reference Season" }, staffCookie, 201)
      ).json(identified);

      await request(
        "POST",
        `/seasons/${referenceSeason.id}/awards`,
        {
          playerId: duplicate,
          awardType: "season_mvp",
          sourceUrl: "https://example.test/reference-season/mvp",
        },
        staffCookie,
        201,
      );

      const { SeasonAward } =
        await import("../src/season/infrastructure/persistence/season.entities.ts");

      const { UniqueConstraintViolationException } = await import("@mikro-orm/core");

      const regularSeasonMvp = async (player: string) =>
        await insert((em, id) =>
          em.create(
            SeasonAward,
            {
              id,
              season: referenceSeason.id,
              player,
              awardType: "regular_season_mvp",
              region: null,
              sourceUrl: "https://example.test/reference-season/regular",
            },
            { partial: true },
          ),
        );

      await regularSeasonMvp(duplicate);
      await assert.rejects(
        regularSeasonMvp(kept),
        UniqueConstraintViolationException,
        "a season holds one award of a type without a region",
      );

      await merge(async (service) => await service.mergePlayers(kept, duplicate));

      const keptRow = await playerRow(kept);
      assert.equal(keptRow.pandascoreId, 77001, "the kept player takes the freed PandaScore id");
      assert.equal(keptRow.source, "pandascore");
      const duplicateRow = await playerRow(duplicate);
      assert.equal(duplicateRow.pandascoreId, null);
      assert.equal(await redirectOf(rosterRows.Player, duplicate), kept);
      assert.equal(
        await redirectOf(rosterRows.Player, redirected),
        kept,
        "merged_into chains are repointed",
      );
      assert.deepEqual(await contractsOf({ player: duplicate }), []);
      assert.deepEqual(
        await contractsOf({ player: kept }),
        [
          [beta, "2024-01-01", "2024-12-31"],
          [alpha, "2026-01-15", null],
        ],
        "duplicate open contracts collapse onto the earlier start date",
      );
      assert.deepEqual(await photosOf(duplicate), []);
      assert.deepEqual(await photosOf(kept), [
        "https://example.test/reference-duplicate-1.jpg",
        "https://example.test/reference-duplicate-2.jpg",
        "https://example.test/reference-kept.jpg",
      ]);
      assert.deepEqual(await awardsOf(duplicate), []);
      assert.deepEqual(await awardsOf(kept), ["defensive_mvp", "mvp"]);
      assert.deepEqual(
        (await request("GET", `/player/${kept}/awards`))
          .json(
            z.object({
              seasonAwards: z.array(z.object({ awardType: z.string(), season: identified })),
            }),
          )
          .seasonAwards.map(({ awardType, season }) => [awardType, season.id]),
        [
          ["season_mvp", referenceSeason.id],
          ["regular_season_mvp", referenceSeason.id],
        ],
        "season awards follow the player merge",
      );
      assert.deepEqual(await members(soloEntry), [kept]);
      assert.deepEqual(await members(sharedEntry), [kept], "no duplicate membership");

      const keeper = await newTeam("Reference Keeper");
      const dropped = await newTeam("Reference Dropped");
      const opponent = await newTeam("Reference Opponent");
      const redirectedTeam = await newTeam("Reference Redirected Team", { mergedInto: dropped });
      const first = await newPlayer("Reference Squad One", { team: dropped });
      const second = await newPlayer("Reference Squad Two", { team: keeper });
      await newContract(first, dropped, "2026-02-01");
      await newContract(first, keeper, "2026-04-01");
      await newContract(second, dropped, "2023-01-01", "2023-12-31");
      const droppedCup = await newCup("Reference Dropped Cup", [dropped, opponent]);
      const keeperCup = await newCup("Reference Keeper Cup", [keeper, opponent]);
      const droppedEntry = droppedCup.participantOf(dropped);

      await merge(async (service) => await service.mergeTeams(keeper, dropped));

      assert.equal((await teamRow(dropped)).active, false);
      assert.equal(await redirectOf(rosterRows.Team, dropped), keeper);
      assert.equal(
        await redirectOf(rosterRows.Team, redirectedTeam),
        keeper,
        "merged_into chains are repointed",
      );
      assert.deepEqual(await contractsOf({ team: dropped }), []);
      assert.deepEqual(await contractsOf({ player: first }), [[keeper, "2026-02-01", null]]);
      assert.deepEqual(await contractsOf({ player: second }), [
        [keeper, "2023-01-01", "2023-12-31"],
      ]);

      for (const id of [first, second]) assert.equal(await playerTeam(id), keeper);
      assert.equal(await participantTeam(droppedEntry), keeper);
      assert.equal(await participantTeam(keeperCup.participantOf(keeper)), keeper);
      assert.equal(await participantTeam(droppedCup.participantOf(opponent)), opponent);

      const twinOne = await newTeam("Reference Twin One");
      const twinTwo = await newTeam("Reference Twin Two");
      const twinCup = await newCup("Reference Twin Cup", [twinOne, twinTwo]);
      await assert.rejects(
        merge(async (service) => await service.mergeTeams(twinOne, twinTwo)),
        (error) => error instanceof ConflictError && error.message.includes(twinCup.id),
      );
      assert.equal(await participantTeam(twinCup.participantOf(twinTwo)), twinTwo);
      assert.equal(await redirectOf(rosterRows.Team, twinTwo), null);
    });

    await check(
      "forum topics, post translations, cooldown, recent activity and deletion",
      async () => {
        const overview = (await request("GET", "/forum")).json(
          z.object({ totalTopics: z.number(), topics: z.array(identified) }),
        );

        assert.equal(overview.totalTopics, 4);
        const id = randomUUID();

        const creation = await request(
          "POST",
          "/posts",
          {
            id,
            title: "Integration Discussion",
            content: "Forum content",
            topicId: overview.topics[0].id,
            translations: [
              {
                locale: "fr-FR",
                title: "Discussion intégration",
                content: "Contenu français",
              },
            ],
          },
          staffCookie,
          201,
        );

        const createdLocation = creation.json(z.object({ publicId: z.number(), slug: z.string() }));

        const created = (await request("GET", `/posts/${id}`)).json(
          z.object({ post: postBody }),
        ).post;

        assert.equal(created.title, "Integration Discussion");
        assert(Number.isInteger(created.publicId) && created.publicId > 0, "post has a public id");
        assert.equal(created.slug, "integration-discussion");
        assert.deepEqual(createdLocation, {
          publicId: created.publicId,
          slug: created.slug,
        });

        const byPublicId = (await request("GET", `/posts/${created.publicId}`)).json(
          z.object({ post: postBody }),
        ).post;

        assert.equal(byPublicId.id, id);
        assert.equal(
          (await request("GET", `/posts/${created.publicId + 1000}`)).json(
            z.object({ post: z.null() }),
          ).post,
          null,
        );
        await request("GET", "/posts/not-a-post", undefined, undefined, 404);
        assert.equal(
          (
            await request("GET", `/posts/${id}`, undefined, undefined, 200, {
              "accept-language": "fr-FR",
            })
          ).json(z.object({ post: postBody })).post.title,
          "Discussion intégration",
        );
        assert.equal(
          (await request("GET", "/posts/creation-status", undefined, staffCookie)).json(
            z.object({ canCreate: z.boolean() }),
          ).canCreate,
          false,
        );

        const preview = (await request("GET", "/forum/preview")).json(
          z.object({ recentPosts: z.array(postBody) }),
        ).recentPosts[0];

        assert.equal(preview.id, id);
        assert.equal(preview.publicId, created.publicId);
        assert.equal(preview.slug, "integration-discussion");

        const listedPost = (await request("GET", "/posts"))
          .json(z.object({ posts: z.array(postBody) }))
          .posts.find((post) => post.id === id);

        assert(listedPost, "the post is listed");
        assert.equal(listedPost.publicId, created.publicId);
        assert.equal(listedPost.slug, "integration-discussion");
        await request("DELETE", `/posts/${id}`, undefined, memberCookie, 403);
        await request("DELETE", `/posts/${id}`, undefined, staffCookie, 204);
        assert.equal(
          (await request("GET", `/posts/${id}`)).json(z.object({ post: z.null() })).post,
          null,
        );
      },
    );

    await check(
      "daily AirRiddle persistence and exact guess use the real player store",
      async () => {
        const today = (await request("GET", "/air-riddle/today")).json(
          z.object({ length: z.number() }),
        );

        const { playerName } = await orm.em
          .fork()
          .findOneOrFail(AirRiddle, { id: { $ne: null } }, { orderBy: { createdAt: "desc" } });

        assert.equal(today.length, playerName.length);

        const guessed = (
          await request(
            "POST",
            "/air-riddle/guess",
            { guess: playerName, last: true },
            undefined,
            201,
          )
        ).json(z.object({ answer: z.string(), results: z.array(z.unknown()) }));

        assert.equal(guessed.answer, playerName);
        assert.equal(guessed.results.length, playerName.length);
        assert.equal(
          (await request("GET", "/air-riddle/today")).json(z.object({ length: z.number() })).length,
          today.length,
        );
      },
    );

    let competition: Awaited<ReturnType<typeof verifyCompetitionImport>>;
    await check(
      "competition import preserves player identity, current membership, local artwork and bracket history",
      async () => {
        competition = await verifyCompetitionImport({
          app,
          orm,
          request,
          staffCookie,
          RequestContext,
        });
      },
    );
    await check(
      "player awards enforce roster membership, staff authorization, uniqueness and revocation",
      async () => {
        await verifyPlayerAwards({
          request,
          staffCookie,
          memberCookie,
          competition,
          outsiderPlayerId: player.id,
        });
      },
    );

    await check(
      "match stats keep one game per Ballchasing replay and number, save players atomically, follow player merges and track imports",
      async () => {
        await verifyMatchStats({ app, orm, request, staffCookie, memberCookie, competition });
      },
    );

    await check(
      "1v1 tournaments take existing players as participants, with matches, scores and stats and no team",
      async () => {
        await verifyPlayerTournaments({
          app,
          orm,
          request,
          staffCookie,
          memberCookie,
          RequestContext,
        });
      },
    );

    await check(
      "manual stages link their matches into a bracket and keep PandaScore brackets out of reach",
      async () => {
        await verifyManualBrackets({ request, staffCookie, memberCookie, competition });
      },
    );

    await check(
      "on this day reads titles, bracket finals and transfers on the Paris day without start.gg",
      async () => {
        await verifyOnThisDay({ orm, request, staffCookie, memberCookie });
      },
    );

    await check(
      "competition sync files stages under the right event and links manual counterparts in SQL",
      async () => {
        await verifyCompetitionSyncLookups({ app, orm, request, staffCookie, RequestContext });
      },
    );

    await check(
      "redistributable scope drops start.gg matches and earnings from lists in SQL",
      async () => {
        await verifyRedistributableScope({ app, orm, request, staffCookie, RequestContext });
      },
    );

    await check(
      "PandaScore player import adopts legacy slugs and never relabels start.gg rows",
      async () => {
        await verifyPandascoreAdoption({ app, orm, request, staffCookie, RequestContext });
      },
    );

    await check(
      "sitemap lists public entities and leaves out merged, empty, canceled and TBD rows",
      async () => {
        await verifySitemap({ orm, request, tournament });
      },
    );

    await check("random player draws only players that were not merged away", async () => {
      const { PlayerService } = await import("../src/roster/application/player.service.ts");
      const players = app.get(PlayerService);
      const merged = await orm.em.fork().find(rosterRows.Player, { mergedInto: { $ne: null } });
      assert(merged.length > 0, "the merge scenarios left redirect rows behind");
      const mergedIds = new Set(merged.map(({ id }) => id));

      for (let draw = 0; draw < 40; draw++) {
        const drawn = await RequestContext.create(
          orm.em.fork(),
          async () => await players.getRandomPlayer(),
        );

        assert(drawn && !mergedIds.has(drawn.id), "a redirect row was drawn as a random player");
      }
    });

    await check("search projections and real PostgreSQL/Redis health", async () => {
      const { Tournament } =
        await import("../src/tournament/infrastructure/persistence/tournament.entities.ts");

      const winnerId = tournament.participants[0].id;
      await orm.em.fork().nativeUpdate(Tournament, { id: tournament.id }, { winner: winnerId });

      const crowned = (
        await request("GET", "/search?q=Integration+Cup&type=tournament&limit=15&offset=0")
      ).json(
        z.object({
          tournaments: z.array(
            z.intersection(
              identified,
              z.object({ winner: z.union([identified, z.null()]).optional() }),
            ),
          ),
        }),
      );

      assert.equal(crowned.tournaments.find((t) => t.id === tournament.id)?.winner?.id, winnerId);

      const found = (await request("GET", "/search?q=Integration&type=all&limit=20&offset=0")).json(
        z.object({
          players: z.array(identified),
          teams: z.array(identified),
          tournaments: z.array(identified),
        }),
      );

      assert(found.players.some((p) => p.id === player.id));
      assert(found.teams.some((t) => t.id === team.id));
      assert(found.tournaments.some((t) => t.id === tournament.id));
      assert.equal(
        (await request("GET", "/health/live")).json(z.object({ status: z.string() })).status,
        "ok",
      );

      const ready = (await request("GET", "/health/ready")).json(
        z.object({
          status: z.string(),
          info: z.object({
            postgres: z.object({ status: z.string() }),
            redis: z.object({ status: z.string() }),
          }),
        }),
      );

      assert.equal(ready.status, "ok");
      assert.equal(ready.info.postgres.status, "up");
      assert.equal(ready.info.redis.status, "up");
    });
    process.stdout.write(`Integration verification passed (${results.length} scenarios).\n`);
  } catch (error) {
    failures.push(
      new Error(`Integration failed after ${results.length} scenarios`, {
        cause: error,
      }),
    );
  } finally {
    const closed = await Promise.allSettled([redisClient?.quit(), application?.close()]);

    for (const result of closed) {
      if (result.status === "rejected") {
        failures.push(result.reason);
      }
    }

    for (const name of containers.reverse()) {
      try {
        docker("rm", "--force", name);
      } catch (error) {
        failures.push(new Error(`Cleanup failed for ${name}`, { cause: error }));
      }
    }
  }

  if (failures.length === 1) throw failures[0];

  if (failures.length > 1) throw new AggregateError(failures, "Integration verification failed");
}, 120_000);
