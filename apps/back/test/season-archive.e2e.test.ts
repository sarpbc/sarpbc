import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { SeasonDetail, StaffPermission } from "@sarpbc/types";
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
  let pilot: SeasonDetail;

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
        { provide: ConfigService, useValue: { get: () => undefined } },
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
    pilot = created.body;
    await http().post("/seasons").set("Cookie", STAFF).send({ name: "Draft" }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps the staff season routes behind tournaments.manage", async () => {
    await request(app.getHttpServer()).get("/seasons").expect(401);
    await request(app.getHttpServer()).get("/seasons").set("Cookie", MEMBER).expect(403);
    await request(app.getHttpServer())
      .post(`/seasons/${pilot.id}/participants`)
      .set("Cookie", MEMBER)
      .send({ teamId: "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b" })
      .expect(403);
    const list = await http().get("/seasons").set("Cookie", STAFF).expect(200);
    expect(list.body.seasons).toHaveLength(2);
  });

  it("publishes slugged seasons to anyone and renders an empty pilot", async () => {
    const index = await request(app.getHttpServer()).get("/season-archives").expect(200);
    expect(index.headers["cache-control"]).toBe("public, max-age=60");
    expect(index.body).toEqual({
      seasons: [{ slug: "pilot-season", name: "Pilot season", winner: null }],
    });

    const archive = await request(app.getHttpServer())
      .get("/season-archives/pilot-season")
      .expect(200);
    expect(archive.body).toEqual({
      slug: "pilot-season",
      name: "Pilot season",
      format: { summary: null, phases: [] },
      winner: null,
      participants: [],
      awards: [],
    });
    expect(JSON.stringify(archive.body)).not.toContain(pilot.id);
  });

  it("answers 404 for an unknown or unpublished slug", async () => {
    await request(app.getHttpServer()).get("/season-archives/rlcs-1999").expect(404);
    await request(app.getHttpServer()).get("/season-archives/draft").expect(404);
  });

  it("refuses a slug another season already uses", async () => {
    const response = await http()
      .post("/seasons")
      .set("Cookie", STAFF)
      .send({ name: "Another pilot", slug: "pilot-season" })
      .expect(409);
    expect(JSON.stringify(response.body)).toContain("pilot-season");
  });

  it("validates archive bodies at the HTTP boundary", async () => {
    await http()
      .patch(`/seasons/${pilot.id}`)
      .set("Cookie", STAFF)
      .send({ name: "Pilot season", winnerTeamId: "vitality" })
      .expect(400);
    await http()
      .post(`/seasons/${pilot.id}/participants`)
      .set("Cookie", STAFF)
      .send({ teamId: "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b", extra: true })
      .expect(400);
    await http()
      .post(`/seasons/${pilot.id}/participants/6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b/path`)
      .set("Cookie", STAFF)
      .send({ label: "", result: "1st" })
      .expect(400);
    await http()
      .post(`/seasons/${pilot.id}/participants`)
      .set("Cookie", STAFF)
      .send({ teamId: "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b" })
      .expect(404);
  });
});
