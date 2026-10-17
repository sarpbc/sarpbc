import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
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
import { ReplyService } from "../src/reply/application/reply.service";
import { MatchController } from "../src/tournament/infrastructure/http/match.controller";
import { MatchService } from "../src/tournament/application/match/match.service";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
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
  const matchService = {
    findDetailById: vi.fn(async (id: string) => {
      if (id === "missing") {
        throw new NotFoundException(`Match with id "${id}" not found`);
      }
      return {
        match: { id, name: "Grand Final" },
        teamForms: {},
        headToHead: null,
      };
    }),
    findUpcomingAndCount: vi.fn(),
    findLiveAndCount: vi.fn(),
    findResultsAndCount: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: "default", ttl: 60_000, limit: 1000 }],
        }),
      ],
      controllers: [AuthController, NewsController, MatchController],
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
        { provide: ReplyService, useValue: { countByTargetIds: vi.fn() } },
        { provide: MatchService, useValue: matchService },
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

  it("returns match detail 200 and 404", async () => {
    await request(app.getHttpServer()).get("/matches/match-1").expect(200);
    await request(app.getHttpServer()).get("/matches/missing").expect(404);
  });
});
