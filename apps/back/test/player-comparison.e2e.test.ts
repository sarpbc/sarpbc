import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { z } from "zod";
import { AuthGuard } from "../src/auth/infrastructure/http/auth.guard";
import { PermissionGuard } from "../src/user/infrastructure/http/user.guard";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { PlayerComparisonService } from "../src/career/application/player-comparison.service";
import { PlayerComparisonController } from "../src/career/infrastructure/http/player-comparison.controller";
import { ContractService } from "../src/roster/application/contract.service";
import { PlayerService } from "../src/roster/application/player.service";
import { PlayerController } from "../src/roster/infrastructure/http/player.controller";
import { SeasonService } from "../src/season/application/season.service";
import { MatchService } from "../src/tournament/application/match/match.service";
import { MatchLineupService } from "../src/tournament/application/match/match-lineup.service";
import { PlayerAwardService } from "../src/tournament/application/player-award.service";
import { TournamentPrizeService } from "../src/tournament/application/tournament-prize.service";
import { TOURNAMENT_QUERIES } from "../src/tournament/infrastructure/competition-queries.tokens";
import { careerSources, zenSeasonAward } from "./career-fixtures";

const comparisonBody = z.object({
  comparison: z.object({
    a: z.looseObject({
      player: z.unknown(),
      titles: z.unknown(),
      teams: z.unknown(),
      series: z.unknown(),
      earnings: z.looseObject({ totals: z.unknown() }),
      awards: z.array(z.looseObject({ id: z.string() })),
      seasonAwards: z.unknown(),
    }),
    b: z.looseObject({ player: z.unknown() }),
    headToHead: z.unknown(),
  }),
});

describe("GET /player/compare (e2e)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [PlayerController, PlayerComparisonController],
      providers: [
        {
          provide: PlayerComparisonService,
          useValue: new PlayerComparisonService(careerSources().sources),
        },
        { provide: PlayerService, useValue: {} },
        { provide: ContractService, useValue: {} },
        { provide: MatchService, useValue: {} },
        { provide: MatchLineupService, useValue: {} },
        { provide: TOURNAMENT_QUERIES, useValue: {} },
        { provide: PlayerAwardService, useValue: {} },
        { provide: SeasonService, useValue: {} },
        { provide: TournamentPrizeService, useValue: {} },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app, []);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns both careers without start.gg competition data", async () => {
    const response = await request(app.getHttpServer())
      .get("/player/compare")
      .query({ a: "zen", b: "vatira" })
      .expect(200);

    const { comparison } = comparisonBody.parse(response.body);

    expect(comparison.a.player).toMatchObject({ id: "zen", slug: "zen" });
    expect(comparison.b.player).toMatchObject({ id: "vatira", slug: "vatira" });
    expect(comparison.a.titles).toEqual([
      {
        id: "rlcs",
        name: "Title rlcs",
        slug: "rlcs",
        endAt: "2026-05-01T00:00:00.000Z",
        event: { id: "cup", slug: "cup", name: "Cup" },
      },
    ]);
    const kc: unknown = expect.objectContaining({ id: "kc", slug: "karmine-corp" });

    expect(comparison.a.teams).toEqual([
      {
        role: "active",
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: null,
        team: kc,
      },
    ]);
    expect(comparison.a.series).toEqual({ wins: 2, losses: 2 });
    expect(comparison.headToHead).toEqual({ a: 1, b: 1 });
    expect(comparison.a.earnings.totals).toEqual([{ currency: "USD", amount: 1500 }]);
    expect(comparison.a.awards.map(({ id }) => id)).toEqual(["major-mvp"]);
    expect(comparison.a.seasonAwards).toEqual([zenSeasonAward]);
    expect(JSON.stringify(response.body)).not.toContain("startgg");
  });

  it("answers 404 for an unknown player", async () => {
    await request(app.getHttpServer())
      .get("/player/compare")
      .query({ a: "zen", b: "ghost" })
      .expect(404);
  });

  it("answers 400 when a player is compared with themselves", async () => {
    await request(app.getHttpServer())
      .get("/player/compare")
      .query({ a: "zen", b: "zen" })
      .expect(400);
  });

  it("answers 400 when a slug is missing", async () => {
    await request(app.getHttpServer()).get("/player/compare").query({ a: "zen" }).expect(400);
  });
});
