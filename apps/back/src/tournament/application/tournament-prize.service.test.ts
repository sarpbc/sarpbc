import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { PrizeEntry } from "../domain/prize-distribution";
import { TournamentPrizeService } from "./tournament-prize.service";

const entry: PrizeEntry = {
  placement: 1,
  amount: 1000,
  currency: "USD",
  teamId: "team-a",
  playerIds: ["player-a"],
};

function setup({ exists = true, missing = [] as string[] } = {}) {
  const writer = {
    tournamentExists: vi.fn().mockResolvedValue(exists),
    missingReferences: vi.fn().mockResolvedValue(missing),
    replace: vi.fn(),
  };
  const reads = {
    byTournament: vi.fn().mockResolvedValue({ source: "manual", prizepool: null, prizes: [] }),
    byTeam: vi.fn().mockResolvedValue([]),
    byPlayer: vi.fn().mockResolvedValue([]),
  };
  const transaction = {
    run: vi.fn((work: (scope: { prizes: typeof writer }) => unknown) => work({ prizes: writer })),
  };
  const service = new TournamentPrizeService(reads, transaction as never);
  return { service, reads, writer };
}

describe("TournamentPrizeService", () => {
  it("replaces the distribution inside the competition transaction", async () => {
    const { service, writer, reads } = setup();

    await service.setDistribution("cup", [entry]);

    expect(writer.missingReferences).toHaveBeenCalledWith({
      teamIds: ["team-a"],
      playerIds: ["player-a"],
    });
    expect(writer.replace).toHaveBeenCalledWith("cup", [entry]);
    expect(reads.byTournament).toHaveBeenCalledWith("cup");
  });

  it("rejects an unknown tournament or a merged team before writing", async () => {
    const missingTournament = setup({ exists: false });
    await expect(missingTournament.service.setDistribution("cup", [entry])).rejects.toThrow(
      NotFoundError,
    );
    expect(missingTournament.writer.replace).not.toHaveBeenCalled();

    const merged = setup({ missing: ["team-a"] });
    await expect(merged.service.setDistribution("cup", [entry])).rejects.toThrow(InvalidInputError);
    expect(merged.writer.replace).not.toHaveBeenCalled();
  });

  it("rejects an invalid distribution without opening a transaction", async () => {
    const { service, writer } = setup();
    await expect(service.setDistribution("cup", [{ ...entry, currency: "ABC" }])).rejects.toThrow(
      InvalidInputError,
    );
    expect(writer.tournamentExists).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown tournament distribution", async () => {
    const { service, reads } = setup();
    reads.byTournament.mockResolvedValue(null);
    await expect(service.findByTournamentId("missing")).rejects.toThrow(NotFoundError);
  });

  it("passes the redistribution scope to the earnings reads", async () => {
    const { service, reads } = setup();
    await service.teamEarnings("team-a", { redistributableOnly: true });
    await service.playerEarnings("player-a", { redistributableOnly: false });
    expect(reads.byTeam).toHaveBeenCalledWith("team-a", { redistributableOnly: true });
    expect(reads.byPlayer).toHaveBeenCalledWith("player-a", { redistributableOnly: false });
  });
});
