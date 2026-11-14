import { SCRIPT_URL } from "./doubles";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { configureApp } from "../src/configure-app";
import {
  ListTournamentsQueryDto,
  type ListTournamentsQueryInput,
} from "../src/tournament/infrastructure/http/dto/list-tournaments-query.dto";
import {
  ListNotificationsQueryDto,
  type ListNotificationsQueryInput,
} from "../src/notification/infrastructure/http/dto/list-notifications-query.dto";
import {
  CreatePostDto,
  type CreatePostInput,
} from "../src/forum/infrastructure/http/post/dto/create-post.dto";
import {
  UpdateTournamentDto,
  type UpdateTournamentInput,
} from "../src/tournament/infrastructure/http/dto/create-tournament.dto";
import {
  CreateNewsArticleDto,
  type CreateNewsArticleInput,
} from "../src/news/infrastructure/http/dto/create-news-article.dto";

function echo<T>(value: T): T {
  return value;
}

@Controller()
class ValidationController {
  private readonly echo = echo;

  @Get("tournaments")
  tournaments(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryInput) {
    return this.echo(query);
  }

  @Get("notifications")
  notifications(@Query({ schema: ListNotificationsQueryDto }) query: ListNotificationsQueryInput) {
    return this.echo(query);
  }

  @Post("posts")
  post(@Body({ schema: CreatePostDto }) body: CreatePostInput) {
    return this.echo(body);
  }

  @Post("tournament")
  tournament(@Body({ schema: UpdateTournamentDto }) body: UpdateTournamentInput) {
    return this.echo(body);
  }

  @Post("news")
  news(@Body({ schema: CreateNewsArticleDto }) body: CreateNewsArticleInput) {
    return this.echo(body);
  }
}

describe("native Nest Zod validation over Fastify", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValidationController],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app, []);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("applies inherited defaults and converts explicit false without truthiness coercion", async () => {
    const defaults = await app.inject({ method: "GET", url: "/tournaments" });
    expect(defaults.statusCode).toBe(200);
    expect(defaults.json()).toEqual({ limit: 20, offset: 0 });

    const query = await app.inject({
      method: "GET",
      url: "/tournaments?limit=3&offset=2&pickems=false&activeOnly=true",
    });

    expect(query.statusCode).toBe(200);
    expect(query.json()).toEqual({ limit: 3, offset: 2, pickems: false, activeOnly: true });
    const notifications = await app.inject({ method: "GET", url: "/notifications" });
    expect(notifications.json()).toEqual({ page: 0, limit: 30 });
  });

  it.each([
    "/tournaments?pickems=1",
    "/tournaments?limit=0",
    "/tournaments?offset=-1",
    "/tournaments?extra=1",
    "/notifications?limit=51",
  ])("rejects invalid query %s", async (url) => {
    const response = await app.inject({ method: "GET", url });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("message", expect.any(Array));
  });

  const post = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Final",
    content: "Great game",
    topicId: "22222222-2222-4222-8222-222222222222",
  };

  it("validates nested translations and rejects nested unknown fields", async () => {
    const translation = { locale: "fr-FR", title: "Finale", content: "Beau match" };

    const accepted = await app.inject({
      method: "POST",
      url: "/posts",
      payload: { ...post, translations: [translation] },
    });

    expect(accepted.statusCode).toBe(201);
    expect(accepted.json()).toHaveProperty("translations", [translation]);

    const rejections = await Promise.all(
      [
        [{ ...translation, author: "staff" }],
        [{ ...translation, locale: "de-DE" }],
        translation,
      ].map(
        async (translations) =>
          await app.inject({
            method: "POST",
            url: "/posts",
            payload: { ...post, translations },
          }),
      ),
    );

    for (const rejected of rejections) expect(rejected.statusCode).toBe(400);
  });

  it("keeps explicit null clears and rejects duplicate tournament teams", async () => {
    const cleared = await app.inject({
      method: "POST",
      url: "/tournament",
      payload: {
        name: "  RLCS  ",
        leagueId: null,
        beginAt: "2026-10-17",
        endAt: null,
        imageUrl: null,
      },
    });

    expect(cleared.statusCode).toBe(201);
    expect(cleared.json()).toEqual({
      name: "RLCS",
      leagueId: null,
      beginAt: "2026-10-17",
      endAt: null,
      imageUrl: null,
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/tournament",
      payload: { teamIds: [post.id, post.id] },
    });

    expect(duplicate.statusCode).toBe(400);
  });

  it("normalizes empty French translations and rejects non-string translations safely", async () => {
    const accepted = await app.inject({
      method: "POST",
      url: "/news",
      payload: { title: "News", content: "Content", titleFr: "  ", contentFr: " Texte " },
    });

    expect(accepted.statusCode).toBe(201);
    expect(accepted.json()).toEqual({
      title: "News",
      content: "Content",
      titleFr: null,
      contentFr: "Texte",
    });

    const rejected = await app.inject({
      method: "POST",
      url: "/news",
      payload: { title: "News", content: "Content", titleFr: 42 },
    });

    expect(rejected.statusCode).toBe(400);
  });

  it.each([SCRIPT_URL, "data:image/png;base64,AAAA", "not a URL"])(
    "rejects invalid cover URL %s",
    async (imageUrl) => {
      const response = await app.inject({
        method: "POST",
        url: "/news",
        payload: { title: "News", content: "Content", imageUrl },
      });

      expect(response.statusCode).toBe(400);
    },
  );
});
