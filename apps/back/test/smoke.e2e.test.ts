import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { AuthController } from "../src/auth/infrastructure/http/auth.controller";
import { authServiceProvider } from "../src/auth/infrastructure/auth.module";
import { AuthGuard } from "../src/auth/infrastructure/http/auth.guard";
import { UserService } from "../src/user/application/user.service";
import { PostHogService } from "../src/infrastructure/telemetry/posthog.service";
import { NewsController } from "../src/news/infrastructure/http/news.controller";
import { NewsService } from "../src/news/application/news.service";
import { TweetEmbedService } from "../src/news/application/tweet-embed.service";
import { TweetImageService } from "../src/news/application/tweet-image.service";
import { ReplyService } from "../src/reply/application/reply.service";
import { MatchController } from "../src/tournament/infrastructure/http/match.controller";
import { MatchService } from "../src/tournament/application/match/match.service";
import { TransferController } from "../src/roster/infrastructure/http/transfer.controller";
import { TransferService } from "../src/roster/application/transfer.service";
import { TeamService } from "../src/roster/application/team.service";
import { PlayerService } from "../src/roster/application/player.service";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { IntegrationError, NotFoundError } from "../src/common/domain/errors";
import { configureApp } from "../src/configure-app";
import type { EntityRef } from "../src/common/domain/entity-ref";
import { League, Match, TournamentParticipant } from "../src/tournament/domain/competition";
import { Team } from "../src/roster/domain/roster";
import { User } from "../src/user/domain/user";

describe("API smoke (e2e)", () => {
  let app: NestFastifyApplication;
  const user = Object.assign(new User("fan@sarpbc.org", "fan", "hash"), { id: "user-1" });
  const userService = {
    signIn: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    create: vi.fn(),
    findOneByGoogleId: vi.fn(),
    findOneByEmail: vi.fn(),
    createGoogleUser: vi.fn(),
    linkGoogleAccount: vi.fn(),
  };
  const newsService = {
    findAllPublishedArticle: vi.fn().mockResolvedValue({
      data: [{ id: "n1", title: "Hello", slug: "hello" }],
      total: 1,
      page: 0,
      limit: 25,
    }),
    findPublishedShortsByWeek: vi.fn(async (week: string) => {
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
    load: vi.fn(async (url: string) => {
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
    },
  });
  const matchService = {
    findDetail: vi.fn(async (ref: EntityRef) => {
      if (ref.kind === "id" && ref.value === MISSING_MATCH_ID) {
        throw new NotFoundError("This match could not be found.");
      }
      return { match: grandFinal, teamForms: {}, headToHead: null };
    }),
    findUpcomingAndCount: vi.fn(),
    findLiveAndCount: vi.fn(),
    findResultsAndCount: vi.fn(),
  };

  const transferService = { findAndCount: vi.fn().mockResolvedValue([[], 0]) };

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
          useValue: { capture: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: NewsService, useValue: newsService },
        { provide: TweetEmbedService, useValue: { embed: vi.fn() } },
        { provide: TweetImageService, useValue: new TweetImageService(tweetImages) },
        { provide: ReplyService, useValue: { countByTargetIds: vi.fn() } },
        { provide: MatchService, useValue: matchService },
        { provide: TransferService, useValue: transferService },
        { provide: TeamService, useValue: { findBySlug: vi.fn() } },
        { provide: PlayerService, useValue: { findBySlug: vi.fn() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app);
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
    const cookieHeader = Array.isArray(cookies) ? cookies.join(";") : String(cookies ?? "");
    expect(cookieHeader).toContain("access_token=");
    expect(cookieHeader).toContain("refresh_token=");
    expect(cookieHeader).toContain("HttpOnly");
  });

  it("lists published news", async () => {
    const response = await request(app.getHttpServer()).get("/news").expect(200);
    expect(response.body.data[0].title).toBe("Hello");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects non-whitelisted news query params", async () => {
    await request(app.getHttpServer()).get("/news?foo=bar").expect(400);
  });

  it("accepts a news type filter", async () => {
    await request(app.getHttpServer()).get("/news?type=short").expect(200);
  });

  it("rejects an invalid news type filter", async () => {
    await request(app.getHttpServer()).get("/news?type=brief").expect(400);
  });

  it("lists short news for an ISO week", async () => {
    await request(app.getHttpServer()).get("/news/weeks/2026-W36").expect(200);
  });

  it("rejects a malformed ISO week id", async () => {
    await request(app.getHttpServer()).get("/news/weeks/2026-W99").expect(400);
  });

  it("proxies allowlisted tweet images with a short public cache", async () => {
    const url = "https://pbs.twimg.com/media/photo.png";
    const response = await request(app.getHttpServer())
      .get(`/news/embed/tweet/image?url=${encodeURIComponent(url)}`)
      .expect(200);

    expect(tweetImages.load).toHaveBeenLastCalledWith(url);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.from(response.body).toString()).toBe("png");
  });

  it.each([
    ["https://evil.example/photo.png", 400],
    ["http://pbs.twimg.com/media/photo.png", 400],
    ["https://pbs.twimg.com/media/removed.jpg", 404],
    ["https://pbs.twimg.com/media/broken.jpg", 500],
  ])("answers %s with %i", async (url, status) => {
    const response = await request(app.getHttpServer())
      .get(`/news/embed/tweet/image?url=${encodeURIComponent(url)}`)
      .expect(status);

    expect(response.headers["cache-control"]).toBeUndefined();
  });

  it("requires a tweet image URL", async () => {
    await request(app.getHttpServer()).get("/news/embed/tweet/image").expect(400);
  });

  it("serves a match by public id with its computed slug", async () => {
    const response = await request(app.getHttpServer()).get("/matches/7250").expect(200);
    expect(matchService.findDetail).toHaveBeenLastCalledWith({ kind: "publicId", value: 7250 });
    expect(response.body.match).toMatchObject({
      publicId: 7250,
      slug: "karmine-corp-vs-team-falcons-rlcs-major-paris-2026-playoffs",
    });
  });

  it("serves a match by its legacy id", async () => {
    await request(app.getHttpServer()).get(`/matches/${grandFinal.id}`).expect(200);
    expect(matchService.findDetail).toHaveBeenLastCalledWith({ kind: "id", value: grandFinal.id });
  });

  it("answers 404 for unknown and malformed match references", async () => {
    await request(app.getHttpServer()).get(`/matches/${MISSING_MATCH_ID}`).expect(404);
    await request(app.getHttpServer()).get("/matches/missing").expect(404);
    await request(app.getHttpServer()).get("/matches/0").expect(404);
    await request(app.getHttpServer()).get("/matches/-4").expect(404);
  });

  it("lists transfers with coerced pagination and period filters", async () => {
    const response = await request(app.getHttpServer())
      .get("/transfers?type=loan&from=2026-01-01&to=2026-06-30&limit=5")
      .expect(200);
    expect(response.body).toEqual({ transfers: [], count: 0 });
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

  it("rejects invalid transfer filters", async () => {
    await request(app.getHttpServer()).get("/transfers?type=coach").expect(400);
    await request(app.getHttpServer()).get("/transfers?from=yesterday").expect(400);
    await request(app.getHttpServer()).get("/transfers?limit=500").expect(400);
    await request(app.getHttpServer()).get("/transfers?season=2026").expect(400);
  });
});
