import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { StaffPermission } from "@sarpbc/types";
import { AuthService } from "../src/auth/application/auth.service";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { OnThisDayFactService } from "../src/on-this-day/application/on-this-day-fact.service";
import { OnThisDayService } from "../src/on-this-day/application/on-this-day.service";
import { OnThisDayFactController } from "../src/on-this-day/infrastructure/http/on-this-day-fact.controller";
import { OnThisDayController } from "../src/on-this-day/infrastructure/http/on-this-day.controller";
import { UserService } from "../src/user/application/user.service";
import {
  MANUAL_STAGE_ID,
  STARTGG_STAGE_ID,
  memoryFactStore,
  onThisDaySources,
} from "./on-this-day-fixtures";

const STAFF = "access_token=staff";
const MEMBER = "access_token=member";

const fact = {
  month: 6,
  day: 5,
  year: 2016,
  textEn: "The first RLCS season began.",
  textFr: "La première saison des RLCS débutait.",
  link: { kind: "tournament", id: MANUAL_STAGE_ID },
  sourceUrl: "https://www.rocketleague.com/news/rlcs",
};

describe("on this day (e2e)", () => {
  let app: NestFastifyApplication;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const store = memoryFactStore();
    const { sources } = onThisDaySources();

    const moduleFixture = await Test.createTestingModule({
      controllers: [OnThisDayController, OnThisDayFactController],
      providers: [
        { provide: OnThisDayFactService, useValue: new OnThisDayFactService(store) },
        { provide: OnThisDayService, useValue: new OnThisDayService({ ...sources, facts: store }) },
        {
          provide: AuthService,
          useValue: {
            authenticate: async (token: string) =>
              ["staff", "member"].includes(token) ? { id: token, email: `${token}@test` } : null,
            refreshSession: async () => null,
          },
        },
        {
          provide: UserService,
          useValue: {
            hasAnyPermission: async (id: string, required: StaffPermission[]) =>
              id === "staff" && required.includes("tournaments.manage"),
          },
        },
        { provide: ConfigService, useValue: { get: () => undefined } },
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

  it("keeps the fact catalog behind tournaments.manage", async () => {
    await http().get("/on-this-day-facts").expect(401);
    await http().get("/on-this-day-facts").set("Cookie", MEMBER).expect(403);
    await http().post("/on-this-day-facts").set("Cookie", MEMBER).send(fact).expect(403);
    await http().get("/on-this-day-facts").set("Cookie", STAFF).expect(200, { facts: [] });
  });

  it("lets staff create, edit and delete a fact, shown publicly on its day only", async () => {
    const created = await http().post("/on-this-day-facts").set("Cookie", STAFF).send(fact);
    expect(created.status).toBe(201);
    const { id } = created.body.fact;

    const day = await http().get("/on-this-day").query({ date: "2026-06-05" }).expect(200);
    expect(day.headers["cache-control"]).toBe("public, max-age=300");
    expect(day.body).toEqual({
      date: "2026-06-05",
      events: [
        {
          kind: "fact",
          year: 2016,
          text: { en: fact.textEn, fr: fact.textFr },
          link: {
            kind: "tournament",
            name: "Playoffs",
            slug: "playoffs",
            event: { name: "French Cup", slug: "french-cup" },
          },
          sourceUrl: fact.sourceUrl,
        },
      ],
    });
    await http().get("/on-this-day").query({ date: "2026-06-06" }).expect(200, {
      date: "2026-06-06",
      events: [],
    });
    await http().get("/on-this-day").query({ date: "2015-06-05" }).expect(200, {
      date: "2015-06-05",
      events: [],
    });

    await http()
      .patch(`/on-this-day-facts/${id}`)
      .set("Cookie", STAFF)
      .send({ ...fact, link: { kind: "tournament", id: STARTGG_STAGE_ID } })
      .expect(200);
    const hidden = await http().get("/on-this-day").query({ date: "2026-06-05" }).expect(200);
    expect(hidden.body.events).toEqual([]);

    await http().delete(`/on-this-day-facts/${id}`).set("Cookie", STAFF).expect(204);
    await http().delete(`/on-this-day-facts/${id}`).set("Cookie", STAFF).expect(404);
  });

  it.each(["https://liquipedia.net/rocketleague/RLCS", "https://www.blast.tv/rl"])(
    "refuses %s as a fact source",
    async (sourceUrl) => {
      await http()
        .post("/on-this-day-facts")
        .set("Cookie", STAFF)
        .send({ ...fact, sourceUrl })
        .expect(400);
    },
  );

  it("refuses an impossible date query", async () => {
    await http().get("/on-this-day").query({ date: "2026-02-30" }).expect(400);
    await http().get("/on-this-day").query({ date: "june" }).expect(400);
  });

  it("answers today without a date", async () => {
    const today = await http().get("/on-this-day").expect(200);
    expect(today.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
