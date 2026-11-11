import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TournamentController } from "./tournament.controller";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import { League, Tournament } from "../../domain/competition";
import { TournamentPrizeService } from "../../application/tournament-prize.service";
import { CompetitionAfterCommit } from "../../application/after-commit";
import { StreamService } from "../../application/stream.service";

const unusedStreams = new StreamService(
  { run: () => Promise.reject(new Error("unused")) },
  new CompetitionAfterCommit(
    { invalidateTournament: async () => {} },
    { publish: async () => {} },
    { error: () => {} },
  ),
);

describe("TournamentController.findOne", () => {
  const redis = { get: vi.fn(), set: vi.fn() };
  const tournaments = { findById: vi.fn() };
  let controller: TournamentController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new TournamentController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      new CachedTournamentRead(tournaments, redis),
      {} as never,
      new TournamentPrizeService(
        { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
        { run: vi.fn() },
        { settle: vi.fn() } as never,
      ),
      new CachedTournamentPrizesRead({ findByTournamentId: vi.fn() }, redis),
      {} as never,
      unusedStreams,
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
});

describe("TournamentController leagues", () => {
  const catalog = {
    leagues: vi.fn(),
    createLeague: vi.fn(),
    updateLeague: vi.fn(),
  };
  const controller = new TournamentController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    catalog as never,
    unusedStreams,
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
    catalog.leagues.mockResolvedValue([manual, synced]);
    expect(await controller.findLeagues()).toEqual({
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
