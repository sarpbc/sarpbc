import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TournamentController } from "./tournament.controller";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import { League } from "../../domain/league";
import { Tournament } from "../../domain/tournament";
import { TournamentPrizeService } from "../../application/tournament-prize.service";
import { CompetitionAfterCommit } from "../../application/after-commit";
import { StreamService } from "../../application/stream.service";
import { MatchLineupService } from "../../application/match/match-lineup.service";
import { ViewershipService } from "../../application/viewership.service";
import { eventQueries, tournamentQueries } from "../../../../test/competition-doubles";
import { transactionOver } from "../../application/ports.test-utils";
import { unconstructed } from "../../../../test/doubles";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { ManualTournamentService } from "../../application/manual-tournament.service";
import { MatchService } from "../../application/match/match.service";
import { PlayerAwardService } from "../../application/player-award.service";
import type { TournamentQueries } from "../../application/ports";
import { memoryRedis } from "../cache/memory-redis.test-utils";
import { fakePlayerStats } from "../../../match-stats/application/fake-player-stats.test-utils";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";

const unusedStreams = new StreamService(
  { run: async () => await Promise.reject(new Error("unused")) },
  new CompetitionAfterCommit(
    { invalidateTournament: async () => {} },
    { publish: async () => {} },
    { error: () => {} },
  ),
);

const unusedLineups = new MatchLineupService(
  { byMatch: async () => [], byPlayer: async () => [] },
  { byIds: async () => [] },
  { run: async () => await Promise.reject(new Error("unused")) },
);

const unusedGameStats = { byMatch: async () => [] };

const unusedViewerships = new ViewershipService({
  run: async () => await Promise.reject(new Error("unused")),
});

const fakeStats = fakePlayerStats({
  player: { currentTeam: null, id: "zen", name: "zen", slug: "zen" },
  team: { id: "team-vit", name: "Vitality", slug: "vitality" },
  teamGoals: 2,
  totals: { assists: 0, demolitions: 1, goals: 1, saves: 2, shots: 3 },
});

const playerStats = new TournamentPlayerStatsService(fakeStats);

const controllerWith = (
  tournaments: TournamentQueries,
  tournamentRead: CachedTournamentRead,
  prizeService: TournamentPrizeService,
  prizesRead: CachedTournamentPrizesRead,
  catalog: ManualCatalogService,
) =>
  new TournamentController(
    tournaments,
    unconstructed(SyncNewTournamentsUseCase),
    unconstructed(SyncPandascoreTournamentUseCase),
    unconstructed(ManualTournamentService),
    unconstructed(MatchService),
    tournamentRead,
    unconstructed(PlayerAwardService),
    prizeService,
    prizesRead,
    catalog,
    unusedStreams,
    unusedLineups,
    unusedGameStats,
    unusedViewerships,
    playerStats,
  );

describe("TournamentController stage reads", () => {
  const redis = memoryRedis();
  const stored = new Map<string, Tournament>();
  let known = (id: string) => stored.get(id) ?? null;
  const tournaments = { findById: async (id: string) => known(id) };
  let controller: TournamentController;

  beforeEach(() => {
    redis.entries.clear();
    redis.writes.length = 0;
    stored.clear();
    known = (id) => stored.get(id) ?? null;
    controller = controllerWith(
      tournamentQueries(),
      new CachedTournamentRead(tournaments, redis),
      new TournamentPrizeService(
        {
          byPlayer: async () => [],
          byTeam: async () => [],
          byTournament: async () => null,
          tournamentSource: async () => null,
        },
        { run: async () => await Promise.reject(new Error("unused")) },
        new CompetitionAfterCommit(
          { invalidateTournament: async () => {} },
          { publish: async () => {} },
          { error: () => {} },
        ),
      ),
      new CachedTournamentPrizesRead(
        { findByTournamentId: async () => await Promise.reject(new Error("unused")) },
        redis,
      ),
      unconstructed(ManualCatalogService),
    );
  });

  it("does not cache misses and returns 404", async () => {
    await expect(controller.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.writes).toHaveLength(0);
  });

  it("returns the tournament response through the read adapter", async () => {
    stored.set(
      "t1",
      Object.assign(new Tournament(), {
        event: { id: "e1", name: "RLCS 2026", slug: "rlcs-2026" },
        id: "t1",
        slug: "playoffs",
      }),
    );
    const result = await controller.findOne("t1");
    expect(result.tournament).toMatchObject({ id: "t1", matches: [], participants: [] });
  });

  it("aggregates the player stats of a stage, 404 for start.gg or unknown stages", async () => {
    known = (id) =>
      id === "missing"
        ? null
        : Object.assign(new Tournament(), {
            event: { id: "e1", name: "Coupe de France", slug: "coupe-de-france-slash-2026" },
            id,
            slug: id,
            source: id === "open-qualifier" ? "startgg" : "manual",
          });

    await expect(controller.getPlayerStats("group-stage")).resolves.toMatchObject({
      games: 1,
      players: [{ goalParticipation: 50, player: { id: "zen" }, totals: { goals: 1, saves: 2 } }],
    });
    await expect(controller.getPlayerStats("open-qualifier")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.getPlayerStats("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("TournamentController leagues", () => {
  const manual = Object.assign(new League(), {
    id: "l1",
    name: "Coupe de France",
    slug: "coupe-de-france",
  });

  const synced = Object.assign(new League(), {
    id: "l2",
    name: "RLCS",
    pandascoreId: 4,
  });

  const catalog = new ManualCatalogService(
    tournamentQueries({ leagues: async () => [manual, synced] }),
    eventQueries(),
    transactionOver({}),
    new CompetitionAfterCommit(
      { invalidateTournament: async () => {} },
      { publish: async () => {} },
      { error: () => {} },
    ),
  );

  const controller = controllerWith(
    tournamentQueries(),
    unconstructed(CachedTournamentRead),
    unconstructed(TournamentPrizeService),
    unconstructed(CachedTournamentPrizesRead),
    catalog,
  );

  it("lists leagues with the fields staff edit and their PandaScore id", async () => {
    await expect(controller.findLeagues()).resolves.toStrictEqual({
      leagues: [
        {
          id: "l1",
          imageUrl: null,
          name: "Coupe de France",
          pandascoreId: null,
          slug: "coupe-de-france",
          url: null,
        },
        {
          id: "l2",
          imageUrl: null,
          name: "RLCS",
          pandascoreId: 4,
          slug: null,
          url: null,
        },
      ],
    });
  });
});
