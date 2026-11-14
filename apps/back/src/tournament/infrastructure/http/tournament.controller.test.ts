import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { tournamentQueries } from "../../../../test/competition-doubles";
import { unconstructed } from "../../../../test/doubles";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { ManualTournamentService } from "../../application/manual-tournament.service";
import { MatchService } from "../../application/match/match.service";
import { PlayerAwardService } from "../../application/player-award.service";
import type { TournamentQueries } from "../../application/ports";
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

const playerLines = vi.fn(async (ids: string[]) =>
  ids.map((id) => ({
    gameId: `game-${id}`,
    account: "steam:1",
    player: { id: "zen", name: "zen", slug: "zen" },
    team: { id: "team-vit", name: "Vitality", slug: "vitality" },
    teamGoals: 2,
    goals: 1,
    assists: 0,
    saves: 2,
    shots: 3,
    demolitions: 1,
  })),
);

const playerStats = new TournamentPlayerStatsService({ playerLines });

function controllerWith(
  tournaments: TournamentQueries,
  tournamentRead: CachedTournamentRead,
  prizeService: TournamentPrizeService,
  prizesRead: CachedTournamentPrizesRead,
  catalog: ManualCatalogService,
): TournamentController {
  return new TournamentController(
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
}

describe("TournamentController stage reads", () => {
  const redis = { get: vi.fn(), set: vi.fn() };
  const tournaments = { findById: vi.fn() };
  let controller: TournamentController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = controllerWith(
      tournamentQueries(),
      new CachedTournamentRead(tournaments, redis),
      new TournamentPrizeService(
        { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
        { run: vi.fn() },
        new CompetitionAfterCommit(
          { invalidateTournament: async () => {} },
          { publish: async () => {} },
          { error: () => {} },
        ),
      ),
      new CachedTournamentPrizesRead({ findByTournamentId: vi.fn() }, redis),
      unconstructed(ManualCatalogService),
    );
    redis.get.mockResolvedValue(null);
  });

  it("does not cache misses and returns 404", async () => {
    tournaments.findById.mockResolvedValue(null);
    await expect(controller.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("returns the tournament response through the read adapter", async () => {
    tournaments.findById.mockResolvedValue(
      Object.assign(new Tournament(), {
        id: "t1",
        slug: "playoffs",
        event: { id: "e1", slug: "rlcs-2026", name: "RLCS 2026" },
      }),
    );
    const result = await controller.findOne("t1");
    expect(result.tournament).toMatchObject({ id: "t1", matches: [], participants: [] });
  });

  it("aggregates the player stats of a stage, 404 for start.gg or unknown stages", async () => {
    tournaments.findById.mockImplementation(async (id: string) =>
      id === "missing"
        ? null
        : Object.assign(new Tournament(), {
            id,
            slug: id,
            source: id === "open-qualifier" ? "startgg" : "manual",
            event: { id: "e1", slug: "coupe-de-france-slash-2026", name: "Coupe de France" },
          }),
    );

    await expect(controller.getPlayerStats("group-stage")).resolves.toMatchObject({
      games: 1,
      players: [{ player: { id: "zen" }, totals: { goals: 1, saves: 2 }, goalParticipation: 50 }],
    });
    await expect(controller.getPlayerStats("open-qualifier")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.getPlayerStats("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(playerLines).toHaveBeenCalledOnce();
    expect(playerLines).toHaveBeenCalledWith(["group-stage"]);
  });
});

describe("TournamentController leagues", () => {
  const catalog = unconstructed(ManualCatalogService);
  const leagues = vi.spyOn(catalog, "leagues");

  const controller = controllerWith(
    tournamentQueries(),
    unconstructed(CachedTournamentRead),
    unconstructed(TournamentPrizeService),
    unconstructed(CachedTournamentPrizesRead),
    catalog,
  );

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

  beforeEach(() => vi.resetAllMocks());

  it("lists leagues with the fields staff edit and their PandaScore id", async () => {
    leagues.mockResolvedValue([manual, synced]);
    await expect(controller.findLeagues()).resolves.toEqual({
      leagues: [
        {
          id: "l1",
          pandascoreId: null,
          name: "Coupe de France",
          slug: "coupe-de-france",
          url: null,
          imageUrl: null,
        },
        {
          id: "l2",
          pandascoreId: 4,
          name: "RLCS",
          slug: null,
          url: null,
          imageUrl: null,
        },
      ],
    });
  });
});
