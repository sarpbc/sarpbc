import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { AuthGuard } from "../src/auth/auth.guard";
import { UserService } from "../src/user/user.service";
import { PostHogService } from "../src/posthog/posthog.service";
import { NewsController } from "../src/news/news.controller";
import { NewsService } from "../src/news/news.service";
import { TweetEmbedService } from "../src/news/tweet-embed.service";
import { ReplyService } from "../src/reply/reply.service";
import { MatchController } from "../src/tournament/match/match.controller";
import { MatchService } from "../src/tournament/match/match.service";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { User } from "../src/user/domain/user.entity";

describe("API smoke (e2e)", () => {
  let app: NestFastifyApplication;
  const user = Object.assign(new User("fan@sarpbc.org", "fan", "hash"), { id: "user-1" });
  const userService = {
    signIn: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    create: jest.fn(),
    findOneByGoogleId: jest.fn(),
    findOneByEmail: jest.fn(),
    createGoogleUser: jest.fn(),
    linkGoogleAccount: jest.fn(),
  };
  const newsService = {
    findAllPublishedArticle: jest.fn().mockResolvedValue({
      data: [{ id: "n1", title: "Hello", slug: "hello" }],
      total: 1,
      page: 0,
      limit: 25,
    }),
  };
  const matchService = {
    findDetailById: jest.fn(async (id: string) => {
      if (id === "missing") {
        throw new NotFoundException(`Match with id "${id}" not found`);
      }
      return {
        match: { id, name: "Grand Final" },
        teamForms: {},
        headToHead: null,
      };
    }),
    findUpcomingAndCount: jest.fn(),
    findLiveAndCount: jest.fn(),
    findResultsAndCount: jest.fn(),
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
        AuthService,
        AuthGuard,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "jwt_token") return "test-jwt-key-for-e2e";
              if (key === "production") return false;
              if (key === "google_client_secret") return "secret";
              if (key === "google_client_id") return "client-id";
              if (key === "google_redirect_uri") return "http://localhost/callback";
              if (key === "front_url") return "http://localhost:4000";
              if (key === "admin_url") return "http://localhost:4002";
              return undefined;
            },
          },
        },
        { provide: UserService, useValue: userService },
        {
          provide: PostHogService,
          useValue: { capture: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: NewsService, useValue: newsService },
        TweetEmbedService,
        { provide: ReplyService, useValue: { countByTargetIds: jest.fn() } },
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

  it("returns match detail 200 and 404", async () => {
    await request(app.getHttpServer()).get("/matches/match-1").expect(200);
    await request(app.getHttpServer()).get("/matches/missing").expect(404);
  });
});
