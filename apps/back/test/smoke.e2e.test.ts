import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { z } from "zod";
import type { MatchGameStats } from "@sarpbc/types";
import { AuthController } from "../src/auth/infrastructure/http/auth.controller";
import { authServiceProvider } from "../src/auth/infrastructure/auth.module";
import { AuthGuard } from "../src/auth/infrastructure/http/auth.guard";
import { UserService } from "../src/user/application/user.service";
import { PostHogService } from "../src/infrastructure/telemetry/posthog.service";
import { NewsController } from "../src/news/infrastructure/http/news.controller";
import { NewsService } from "../src/news/application/news.service";
import { TweetEmbedService } from "../src/news/application/tweet-embed.service";
import {
  TweetImageService,
  type TweetImageGateway,
} from "../src/news/application/tweet-image.service";
import { ReplyService } from "../src/reply/application/reply.service";
import { MatchController } from "../src/tournament/infrastructure/http/match.controller";
import type { GameStatsStore } from "../src/match-stats/application/ports";
import { GAME_STATS_STORE } from "../src/match-stats/infrastructure/game-stats.tokens";
import { MatchService } from "../src/tournament/application/match/match.service";
import { MatchLineupService } from "../src/tournament/application/match/match-lineup.service";
import { TransferController } from "../src/roster/infrastructure/http/transfer.controller";
import { TransferService } from "../src/roster/application/transfer.service";
import { TeamService } from "../src/roster/application/team.service";
import { PlayerService } from "../src/roster/application/player.service";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { IntegrationError } from "../src/common/domain/errors/integration-error";
import { NotFoundError } from "../src/common/domain/errors/not-found-error";
import { configureApp } from "../src/configure-app";
import { League } from "../src/tournament/domain/league";
import { Match } from "../src/tournament/domain/match";
import { TournamentParticipant } from "../src/tournament/domain/tournament-participant";
import { Team } from "../src/roster/domain/team";
import { User } from "../src/user/domain/user";

describe("API smoke (e2e)", () => {
  let app: NestFastifyApplication;
  const user = Object.assign(new User("fan@sarpbc.org", "fan", "hash"), { id: "user-1" });

  const userService = {
    signIn: vi.fn<UserService["signIn"]>().mockResolvedValue(user),
    findById: vi.fn<UserService["findById"]>().mockResolvedValue(user),
    create: vi.fn<UserService["create"]>(),
    findOneByGoogleId: vi.fn<UserService["findOneByGoogleId"]>(),
    findOneByEmail: vi.fn<UserService["findOneByEmail"]>(),
    createGoogleUser: vi.fn<UserService["createGoogleUser"]>(),
    linkGoogleAccount: vi.fn<UserService["linkGoogleAccount"]>(),
  };

  const newsService = {
    findAllPublishedArticle: vi.fn<NewsService["findAllPublishedArticle"]>().mockResolvedValue({
      data: [
        {
          id: "n1",
          title: "Hello",
          slug: "hello",
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          imageUrl: null,
          excerpt: "Hello world",
          commentCount: 0,
          type: "article",
        },
      ],
      total: 1,
      page: 0,
      limit: 25,
    }),
    findPublishedShortsByWeek: vi.fn<NewsService["findPublishedShortsByWeek"]>(async (week) => {
      if (week === "2026-W99") {
        throw new BadRequestException("Week must be an ISO week id (e.g. 2026-W36).");
      }

      return {
        week,
        start: new Date("2026-08-31T00:00:00.000Z"),
        end: new Date("2026-09-07T00:00:00.000Z"),
        items: [],
      };
    }),
  };

  const tweetImages = {
    load: vi.fn<TweetImageGateway["load"]>(async (url) => {
      if (url.endsWith("/removed.jpg")) {
        throw new NotFoundError("This image is no longer available on X.");
      }

      if (url.endsWith("/broken.jpg")) {
        throw new IntegrationError("Could not load this image from X. Try again in a moment.");
      }

      return { contentType: "image/png", body: Buffer.from("png") };
    }),
  };

  const MISSING_MATCH_ID = "11111111-1111-4111-8111-111111111111";

  const grandFinal = Object.assign(new Match(), {
    publicId: 7250,
    name: "Grand Final: Karmine Corp vs Team Falcons",
    participants: ["Karmine Corp", "Team Falcons"].map((name) =>
      Object.assign(new TournamentParticipant(), { team: Object.assign(new Team(), { name }) }),
    ),
    tournament: {
      name: "Playoffs",
      slug: "playoffs",
      event: { id: "event", slug: "rlcs-major-paris-2026", name: "RLCS Major Paris 2026" },
      beginAt: null,
      league: Object.assign(new League(), { name: "RLCS Major" }),
      streams: [],
      eventStreams: [],
    },
  });

  const matchService = {
    findDetail: vi.fn<MatchService["findDetail"]>(async (ref) => {
      if (ref.kind === "id" && ref.value === MISSING_MATCH_ID) {
        throw new NotFoundError("This match could not be found.");
      }

      return { match: grandFinal, teamForms: {}, headToHead: null };
    }),
    findBlocks: vi.fn<MatchService["findBlocks"]>(async (blocks) => blocks.map(() => [grandFinal])),
  };

  const games: MatchGameStats[] = [
    {
      number: 1,
      ballchasingId: "replay-1",
      playedAt: "2026-06-01T18:05:00.000Z",
      teams: [
        {
          participantId: "p1",
          goals: 2,
          players: [
            {
              name: "Vatira",
              player: null,
              goals: 2,
              assists: 0,
              saves: 1,
              shots: 3,
              demolitions: 1,
            },
          ],
        },
      ],
    },
  ];

  const matchGames = { byMatch: vi.fn<GameStatsStore["byMatch"]>(async () => games) };

  const transferService = {
    findAndCount: vi.fn<TransferService["findAndCount"]>().mockResolvedValue([[], 0]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: "default", ttl: 60_000, limit: 1000 }],
        }),
      ],
      controllers: [AuthController, NewsController, MatchController, TransferController],
      providers: [
        authServiceProvider,
        AuthGuard,
        JwtService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            jwt_token: "test-jwt-key-for-e2e",
            production: false,
            google_client_secret: "secret",
            google_client_id: "client-id",
            google_redirect_uri: "http://localhost/callback",
            front_url: "http://localhost:4000",
            admin_url: "http://localhost:4002",
          }),
        },
        { provide: UserService, useValue: userService },
        {
          provide: PostHogService,
          useValue: {
            capture: vi.fn<PostHogService["capture"]>(),
            flush: vi.fn<PostHogService["flush"]>().mockResolvedValue(undefined),
          },
        },
        { provide: NewsService, useValue: newsService },
        { provide: TweetEmbedService, useValue: { embed: vi.fn<TweetEmbedService["embed"]>() } },
        { provide: TweetImageService, useValue: new TweetImageService(tweetImages) },
        {
          provide: ReplyService,
          useValue: {
            countByTargetIds: vi.fn<ReplyService["countByTargetIds"]>(
              async () => new Map([[grandFinal.id, 2]]),
            ),
          },
        },
        { provide: MatchService, useValue: matchService },
        {
          provide: MatchLineupService,
          useValue: { forMatch: vi.fn<MatchLineupService["forMatch"]>(async () => []) },
        },
        { provide: GAME_STATS_STORE, useValue: matchGames },
        { provide: TransferService, useValue: transferService },
        { provide: TeamService, useValue: { findBySlug: vi.fn<TeamService["findBySlug"]>() } },
        { provide: PlayerService, useValue: { findBySlug: vi.fn<PlayerService["findBySlug"]>() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app, []);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("sets httpOnly access and refresh cookies on login", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "fan@sarpbc.org", password: "password12" })
      .expect(200);

    const cookies = response.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join(";") : (cookies ?? "");
    expect(cookieHeader).toContain("access_token=");
    expect(cookieHeader).toContain("refresh_token=");
    expect(cookieHeader).toContain("HttpOnly");
  });

  it("lists published news", async () => {
    const response = await request(app.getHttpServer()).get("/news").expect(200);
    expect(response.body).toHaveProperty("data[0].title", "Hello");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    ["/news?foo=bar", 400],
    ["/news?type=short", 200],
    ["/news?type=brief", 400],
    ["/news/weeks/2026-W36", 200],
    ["/news/weeks/2026-W99", 400],
    ["/news/embed/tweet/image", 400],
  ])("answers GET %s with %i", async (path, status) => {
    const response = await request(app.getHttpServer()).get(path);

    expect(response.status).toBe(status);
  });

  const TWEET_IMAGE_URL = "https://pbs.twimg.com/media/photo.png";

  const fetchTweetImage = async (url: string) =>
    await request(app.getHttpServer()).get(
      `/news/embed/tweet/image?url=${encodeURIComponent(url)}`,
    );

  it("proxies allowlisted tweet images with a short public cache", async () => {
    const response = await fetchTweetImage(TWEET_IMAGE_URL);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    expect(Buffer.from(response.body).toString()).toBe("png");
  });

  it("locks down proxied tweet images", async () => {
    const response = await fetchTweetImage(TWEET_IMAGE_URL);

    expect(tweetImages.load).toHaveBeenLastCalledWith(TWEET_IMAGE_URL);
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    ["https://evil.example/photo.png", 400],
    ["http://pbs.twimg.com/media/photo.png", 400],
    ["https://pbs.twimg.com/media/removed.jpg", 404],
    ["https://pbs.twimg.com/media/broken.jpg", 500],
  ])("answers %s with %i", async (url, status) => {
    const response = await fetchTweetImage(url);

    expect(response.status).toBe(status);
    expect(response.headers["cache-control"]).toBeUndefined();
  });

  it("serves a match by public id with its computed slug", async () => {
    const response = await request(app.getHttpServer()).get("/matches/7250").expect(200);
    expect(matchService.findDetail).toHaveBeenLastCalledWith({ kind: "publicId", value: 7250 });
    expect(response.body).toMatchObject({
      match: {
        publicId: 7250,
        slug: "karmine-corp-vs-team-falcons-rlcs-major-paris-2026-playoffs",
      },
    });
    expect(matchGames.byMatch).toHaveBeenLastCalledWith(grandFinal.id);
    expect(response.body).toHaveProperty("games", games);
  });

  it("serves a match by its legacy id", async () => {
    const response = await request(app.getHttpServer()).get(`/matches/${grandFinal.id}`);

    expect(response.status).toBe(200);
    expect(matchService.findDetail).toHaveBeenLastCalledWith({ kind: "id", value: grandFinal.id });
  });

  it.each([MISSING_MATCH_ID, "missing", "0", "-4"])(
    "answers 404 for the unknown match reference %s",
    async (reference) => {
      const response = await request(app.getHttpServer()).get(`/matches/${reference}`);

      expect(response.status).toBe(404);
    },
  );

  it("resolves article match blocks in one batched call", async () => {
    const team = "c9e1a3b5-7d9f-4b1d-a3c5-e7f9b1d3f544";

    const response = await request(app.getHttpServer())
      .get(`/matches/blocks?block=match:${grandFinal.id}&block=team:${team}:5`)
      .expect(200);

    expect(matchService.findBlocks).toHaveBeenLastCalledWith(
      [
        { kind: "match", id: grandFinal.id },
        { kind: "team", id: team, limit: 5 },
      ],
      expect.any(Date),
    );
    expect(response.headers["cache-control"]).toBe("public, max-age=10");

    const { blocks } = z
      .object({ blocks: z.record(z.string(), z.array(z.unknown())) })
      .parse(response.body);

    expect(Object.keys(blocks)).toStrictEqual([`match:${grandFinal.id}`, `team:${team}:5`]);
    expect(blocks[`team:${team}:5`]?.[0]).toMatchObject({
      publicId: 7250,
      state: "upcoming",
      commentCount: 2,
    });
  });

  const tooManyBlocks = Array.from(
    { length: 21 },
    (_, index) => `block=match:0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f${String(index).padStart(2, "0")}`,
  ).join("&");

  it.each(["", "?block=team:falcons:5", `?${tooManyBlocks}`])(
    "rejects the malformed match blocks query %#",
    async (query) => {
      const response = await request(app.getHttpServer()).get(`/matches/blocks${query}`);

      expect(response.status).toBe(400);
    },
  );

  it("lists transfers with coerced pagination and period filters", async () => {
    const response = await request(app.getHttpServer())
      .get("/transfers?type=loan&from=2026-01-01&to=2026-06-30&limit=5")
      .expect(200);

    expect(response.body).toStrictEqual({ transfers: [], count: 0 });
    expect(transferService.findAndCount).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "loan",
        from: new Date("2026-01-01"),
        to: new Date("2026-06-30"),
        limit: 5,
        offset: 0,
      }),
    );
  });

  it.each(["type=coach", "from=yesterday", "limit=500", "season=2026"])(
    "rejects the invalid transfer filter %s",
    async (query) => {
      const response = await request(app.getHttpServer()).get(`/transfers?${query}`);

      expect(response.status).toBe(400);
    },
  );
});
