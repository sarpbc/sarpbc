import { describe, expect, it, vi } from "vitest";
import { SetTournamentPrizesDto } from "./dto/set-tournament-prizes.dto";
import { TournamentController } from "./tournament.controller";

const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";

describe("TournamentController prizes", () => {
  const distribution = { source: "startgg", prizepool: "1000 United States Dollar", prizes: [] };
  const prizes = {
    findByTournamentId: vi.fn().mockResolvedValue(distribution),
    setDistribution: vi.fn().mockResolvedValue(distribution),
  };
  const controller = new TournamentController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    prizes as never,
  );

  it("serves start.gg distributions to the site with their source for the credit", async () => {
    expect(await controller.getPrizes("cup")).toEqual(distribution);
    expect(prizes.findByTournamentId).toHaveBeenCalledWith("cup");
  });

  it("replaces the distribution from the validated body", async () => {
    const body = SetTournamentPrizesDto.parse({
      prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID }],
    });

    await controller.setPrizes("cup", body);

    expect(prizes.setDistribution).toHaveBeenCalledWith("cup", [
      { placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, playerIds: [] },
    ]);
  });

  it("rejects malformed prize entries", () => {
    const parse = (
      entry: Partial<{ placement: number; amount: number; currency: string; teamId: string }>,
    ) =>
      SetTournamentPrizesDto.safeParse({
        prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, ...entry }],
      }).success;

    expect(parse({})).toBe(true);
    expect(parse({ amount: 12.5 })).toBe(false);
    expect(parse({ placement: 0 })).toBe(false);
    expect(parse({ teamId: "team-a" })).toBe(false);
    expect(parse({ currency: "DOLLAR" })).toBe(false);
  });
});
