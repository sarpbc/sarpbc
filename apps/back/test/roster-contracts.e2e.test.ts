import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AuthGuard } from "../src/auth/infrastructure/http/auth.guard";
import { PermissionGuard } from "../src/user/infrastructure/http/user.guard";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { ContractService } from "../src/roster/application/contract.service";
import { PlayerService } from "../src/roster/application/player.service";
import type {
  ContractQueries,
  RosterTransaction,
  TeamQueries,
} from "../src/roster/application/ports";
import { Contract, Player, Team } from "../src/roster/domain/roster";
import { PlayerController } from "../src/roster/infrastructure/http/player.controller";
import { MatchService } from "../src/tournament/application/match/match.service";
import { MatchLineupService } from "../src/tournament/application/match/match-lineup.service";
import { PlayerAwardService } from "../src/tournament/application/player-award.service";
import { TournamentPrizeService } from "../src/tournament/application/tournament-prize.service";
import { TOURNAMENT_QUERIES } from "../src/tournament/infrastructure/competition-queries.tokens";

describe("Staff contract writes keep the career consistent (e2e)", () => {
  let app: NestFastifyApplication;
  const kcId = "0b1c9c0e-6a5b-4a53-9b0a-1f4f6f0a0001";
  const kc = Object.assign(new Team(), { id: kcId, name: "Karmine Corp" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen", team: kc });
  let career: Contract[];

  const scope = {
    players: { findById: async (id: string) => (id === zen.id ? zen : null) },
    teams: { findById: async (id: string) => (id === kcId ? kc : null) },
    contracts: {
      findByPlayer: async () => career,
      findById: async (id: string) => {
        const stored = career.find((contract) => contract.id === id);
        return stored ? Object.assign(new Contract(), stored) : null;
      },
      save: async (contract: Contract) => {
        contract.id ||= `contract-${career.length + 1}`;
        career = [...career.filter((stored) => stored.id !== contract.id), contract];
      },
    },
  } as never;
  const transaction: RosterTransaction = { run: async (work) => work(scope) };

  beforeAll(async () => {
    career = [
      Object.assign(new Contract(), {
        id: "open",
        player: zen,
        team: kc,
        startDate: new Date("2025-06-01"),
        endDate: null,
      }),
    ];
    const moduleFixture = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        {
          provide: ContractService,
          useValue: new ContractService({} as ContractQueries, {} as TeamQueries, transaction),
        },
        { provide: PlayerService, useValue: {} },
        { provide: MatchService, useValue: {} },
        { provide: MatchLineupService, useValue: {} },
        { provide: TOURNAMENT_QUERIES, useValue: {} },
        { provide: PlayerAwardService, useValue: {} },
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

  it("answers 422 when a contract overlaps another one with the same team", async () => {
    const response = await request(app.getHttpServer())
      .post("/player/zen/contract")
      .send({ teamId: kcId, startDate: "2024-01-01", endDate: "2025-07-01" })
      .expect(422);

    expect(response.body.message).toContain('overlaps contract "open"');
    expect(career).toHaveLength(1);
  });

  it("answers 422 when a patch makes a contract overlap another one", async () => {
    career.push(
      Object.assign(new Contract(), {
        id: "past",
        player: zen,
        team: kc,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-05-31"),
      }),
    );

    const response = await request(app.getHttpServer())
      .patch("/player/zen/contract/past")
      .send({ endDate: "2025-07-01" })
      .expect(422);

    expect(response.body.message).toContain('overlaps contract "open"');
    expect(career.find(({ id }) => id === "past")?.endDate).toEqual(new Date("2025-05-31"));
  });

  it("still stores a back-to-back period", async () => {
    await request(app.getHttpServer())
      .post("/player/zen/contract")
      .send({ teamId: kcId, startDate: "2023-01-01", endDate: "2024-01-01" })
      .expect(201);

    expect(career).toHaveLength(3);
  });
});
