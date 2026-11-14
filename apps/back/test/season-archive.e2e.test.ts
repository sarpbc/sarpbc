import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
import { SeasonArchiveService } from "../src/season/application/season-archive.service";
import { SeasonService } from "../src/season/application/season.service";
import { SeasonArchiveController } from "../src/season/infrastructure/http/season-archive.controller";
import { SeasonController } from "../src/season/infrastructure/http/season.controller";
import { UserService } from "../src/user/application/user.service";
import { memorySeasonStore } from "./season-store.memory";

const STAFF = "access_token=staff";
const MEMBER = "access_token=member";

describe("season archives (e2e)", () => {
  let app: NestFastifyApplication;
  let pilot: { id: string };

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const { store } = memorySeasonStore();

    const moduleFixture = await Test.createTestingModule({
      controllers: [SeasonController, SeasonArchiveController],
      providers: [
        { provide: SeasonService, useValue: new SeasonService(store) },
        { provide: SeasonArchiveService, useValue: new SeasonArchiveService(store) },
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

    const created = await http()
      .post("/seasons")
      .set("Cookie", STAFF)
      .send({ name: "Pilot season", slug: "Pilot Season" })
      .expect(201);

    pilot = z.object({ id: z.string() }).parse(created.body);
    await http().post("/seasons").set("Cookie", STAFF).send({ name: "Draft" }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["anonymous", undefined, 401],
    ["a member", MEMBER, 403],
  ])("keeps the season list from %s", async (_, cookie, status) => {
    const response = await http()
      .get("/seasons")
      .set("Cookie", cookie ?? "");

    expect(response.status).toBe(status);
  });

  it("refuses a member adding a participant", async () => {
    const response = await http()
      .post(`/seasons/${pilot.id}/participants`)
      .set("Cookie", MEMBER)
      .send({ teamId: "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b" });

    expect(response.status).toBe(403);
  });

  it("lists every season to staff", async () => {
    const list = await http().get("/seasons").set("Cookie", STAFF);

    expect(list.status).toBe(200);
    expect(z.object({ seasons: z.array(z.unknown()) }).parse(list.body).seasons).toHaveLength(2);
  });

  it("lists slugged seasons to anyone", async () => {
    const index = await http().get("/season-archives");

    expect(index.headers["cache-control"]).toBe("public, max-age=60");
    expect(index.body).toStrictEqual({
      seasons: [{ slug: "pilot-season", name: "Pilot season", winner: null }],
    });
  });

  it("renders an empty pilot archive", async () => {
    const archive = await http().get("/season-archives/pilot-season");

    expect(archive.status).toBe(200);
    expect(archive.body).toStrictEqual({
      slug: "pilot-season",
      name: "Pilot season",
      format: { summary: null, phases: [] },
      winner: null,
      participants: [],
      awards: [],
    });
    expect(JSON.stringify(archive.body)).not.toContain(pilot.id);
  });

  it.each(["rlcs-1999", "draft"])(
    "answers 404 for the unknown or unpublished slug %s",
    async (slug) => {
      const response = await http().get(`/season-archives/${slug}`);

      expect(response.status).toBe(404);
    },
  );

  it("refuses a slug another season already uses", async () => {
    const response = await http()
      .post("/seasons")
      .set("Cookie", STAFF)
      .send({ name: "Another pilot", slug: "pilot-season" });

    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).toContain("pilot-season");
  });

  const TEAM_ID = "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";

  it.each([
    [
      "an unknown winner team",
      "patch",
      (id: string) => `/seasons/${id}`,
      { name: "Pilot season", winnerTeamId: "vitality" },
      400,
    ],
    [
      "an unexpected participant field",
      "post",
      (id: string) => `/seasons/${id}/participants`,
      { teamId: TEAM_ID, extra: true },
      400,
    ],
    [
      "an empty path label",
      "post",
      (id: string) => `/seasons/${id}/participants/${TEAM_ID}/path`,
      { label: "", result: "1st" },
      400,
    ],
    [
      "a participant team that does not exist",
      "post",
      (id: string) => `/seasons/${id}/participants`,
      { teamId: TEAM_ID },
      404,
    ],
  ] as const)("answers %s with the status %i", async (_, method, path, body, status) => {
    const response = await http()[method](path(pilot.id)).set("Cookie", STAFF).send(body);

    expect(response.status).toBe(status);
  });
});
