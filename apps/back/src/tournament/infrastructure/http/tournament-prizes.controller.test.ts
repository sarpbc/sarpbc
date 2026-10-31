import { beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import type { TournamentPrizes } from "@sarpbc/types";
import { MAX_PRIZE_AMOUNT, MAX_PRIZE_PLAYERS } from "@sarpbc/utils";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import { ManualTournamentService } from "../../application/manual-tournament.service";
import { MatchService } from "../../application/match/match.service";
import { PlayerAwardService } from "../../application/player-award.service";
import { TournamentPrizeService } from "../../application/tournament-prize.service";
import { TournamentService } from "../../application/tournament.service";
import { SetTournamentPrizesDto } from "./dto/set-tournament-prizes.dto";
import { TournamentController } from "./tournament.controller";

const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";

describe("TournamentController prizes", () => {
  const distribution: TournamentPrizes = {
    source: "startgg",
    prizepool: "1000 United States Dollar",
    prizes: [],
  };
  const prizes = new TournamentPrizeService(
    { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
    { run: vi.fn() },
    { invalidateTournament: vi.fn() },
    { error: vi.fn() },
  );
  const findByTournamentId = vi.spyOn(prizes, "findByTournamentId").mockResolvedValue(distribution);
  const setDistribution = vi.spyOn(prizes, "setDistribution").mockResolvedValue(distribution);
  const prizesRead = new CachedTournamentPrizesRead(prizes, {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  });
  let controller: TournamentController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: TournamentService, useValue: {} },
        { provide: ManualTournamentService, useValue: {} },
        { provide: MatchService, useValue: {} },
        { provide: CachedTournamentRead, useValue: {} },
        { provide: PlayerAwardService, useValue: {} },
      ],
    }).compile();
    controller = new TournamentController(
      module.get(TournamentService),
      module.get(ManualTournamentService),
      module.get(MatchService),
      module.get(CachedTournamentRead),
      module.get(PlayerAwardService),
      prizes,
      prizesRead,
    );
  });

  it("serves start.gg distributions to the site with their source for the credit", async () => {
    expect(await controller.getPrizes("cup")).toEqual(distribution);
    expect(findByTournamentId).toHaveBeenCalledWith("cup");
  });

  it("replaces the distribution from the validated body", async () => {
    const body = SetTournamentPrizesDto.parse({
      prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID }],
    });

    await controller.setPrizes("cup", body);

    expect(setDistribution).toHaveBeenCalledWith("cup", [
      { placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, playerIds: [] },
    ]);
  });

  it("rejects malformed prize entries", () => {
    const parse = (
      entry: Partial<{
        placement: number;
        amount: number;
        currency: string;
        teamId: string;
        playerIds: string[];
      }>,
    ) =>
      SetTournamentPrizesDto.safeParse({
        prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, ...entry }],
      }).success;

    expect(parse({})).toBe(true);
    expect(parse({ amount: 12.5 })).toBe(false);
    expect(parse({ placement: 0 })).toBe(false);
    expect(parse({ teamId: "team-a" })).toBe(false);
    expect(parse({ currency: "DOLLAR" })).toBe(false);
    expect(parse({ amount: MAX_PRIZE_AMOUNT })).toBe(true);
    expect(parse({ amount: MAX_PRIZE_AMOUNT + 1 })).toBe(false);
    expect(parse({ playerIds: Array.from({ length: MAX_PRIZE_PLAYERS }, () => TEAM_ID) })).toBe(
      true,
    );
    expect(parse({ playerIds: Array.from({ length: MAX_PRIZE_PLAYERS + 1 }, () => TEAM_ID) })).toBe(
      false,
    );
  });
});
