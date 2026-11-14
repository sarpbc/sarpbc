import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import request from "supertest";
import type { StaffPermission } from "@sarpbc/types";
import { z } from "zod";
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
        { provide: ConfigService, useValue: { get: () => {} } },
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

  it.each([
    ["anonymous", undefined, 401],
    ["a member", MEMBER, 403],
  ])("keeps the fact catalog from %s", async (_, cookie, status) => {
    const response = await http()
      .get("/on-this-day-facts")
      .set("Cookie", cookie ?? "");

    expect(response.status).toBe(status);
  });

  it("refuses a member creating a fact", async () => {
    const response = await http().post("/on-this-day-facts").set("Cookie", MEMBER).send(fact);

    expect(response.status).toBe(403);
  });

  it("lists the empty fact catalog to staff", async () => {
    const response = await http().get("/on-this-day-facts").set("Cookie", STAFF);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ facts: [] });
  });

  describe("facts managed by staff", () => {
    const createdIds: string[] = [];

    afterEach(async () => {
      await Promise.all(
        createdIds
          .splice(0)
          .map(async (id) => await http().delete(`/on-this-day-facts/${id}`).set("Cookie", STAFF)),
      );
    });

    const createFact = async () => {
      const created = await http().post("/on-this-day-facts").set("Cookie", STAFF).send(fact);
      const { id } = z.object({ fact: z.object({ id: z.string() }) }).parse(created.body).fact;
      createdIds.push(id);

      return { id, status: created.status };
    };

    it("lets staff create a fact", async () => {
      const { status } = await createFact();

      expect(status).toBe(201);
    });

    it("shows a fact publicly on its day", async () => {
      await createFact();

      const day = await http().get("/on-this-day").query({ date: "2026-06-05" });

      expect(day.headers["cache-control"]).toBe("public, max-age=300");
      expect(day.body).toStrictEqual({
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
    });

    it.each(["2026-06-06", "2015-06-05"])("hides a fact on %s", async (date) => {
      await createFact();

      const day = await http().get("/on-this-day").query({ date });

      expect(day.body).toStrictEqual({ date, events: [] });
    });

    it("hides a fact once it links to a start.gg stage", async () => {
      const { id } = await createFact();

      const edited = await http()
        .patch(`/on-this-day-facts/${id}`)
        .set("Cookie", STAFF)
        .send({ ...fact, link: { kind: "tournament", id: STARTGG_STAGE_ID } });

      const hidden = await http().get("/on-this-day").query({ date: "2026-06-05" });

      expect(edited.status).toBe(200);
      expect(hidden.body).toHaveProperty("events", []);
    });

    it("deletes a fact once", async () => {
      const { id } = await createFact();

      const first = await http().delete(`/on-this-day-facts/${id}`).set("Cookie", STAFF);
      const second = await http().delete(`/on-this-day-facts/${id}`).set("Cookie", STAFF);

      expect(first.status).toBe(204);
      expect(second.status).toBe(404);
    });
  });

  it.each(["https://liquipedia.net/rocketleague/RLCS", "https://www.blast.tv/rl"])(
    "refuses %s as a fact source",
    async (sourceUrl) => {
      const response = await http()
        .post("/on-this-day-facts")
        .set("Cookie", STAFF)
        .send({ ...fact, sourceUrl });

      expect(response.status).toBe(400);
    },
  );

  it.each(["2026-02-30", "june"])("refuses the date query %s", async (date) => {
    const response = await http().get("/on-this-day").query({ date });

    expect(response.status).toBe(400);
  });

  it("answers today without a date", async () => {
    const today = await http().get("/on-this-day");

    expect(today.status).toBe(200);
    expect(z.object({ date: z.string() }).parse(today.body).date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });
});
