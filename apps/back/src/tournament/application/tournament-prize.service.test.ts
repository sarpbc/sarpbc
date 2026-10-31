import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { PrizeEntry } from "../domain/prize-distribution";
import type { PrizeParticipant, PrizeQueries, PrizeTransaction, PrizeWriter } from "./ports";
import { TournamentPrizeService } from "./tournament-prize.service";

const entry: PrizeEntry = {
  placement: 1,
  amount: 1000,
  currency: "USD",
  teamId: "team-a",
  playerIds: ["player-a"],
};

const rosterA: PrizeParticipant = { teamId: "team-a", playerIds: ["player-a", "player-b"] };

function setup({
  exists = true,
  participants = [rosterA],
  source = "manual",
}: { exists?: boolean; participants?: PrizeParticipant[]; source?: DataSource | null } = {}) {
  const writer = {
    tournamentExists: vi.fn<PrizeWriter["tournamentExists"]>().mockResolvedValue(exists),
    participants: vi.fn<PrizeWriter["participants"]>().mockResolvedValue(participants),
    replace: vi.fn<PrizeWriter["replace"]>(),
  };
  const reads = {
    tournamentSource: vi.fn<PrizeQueries["tournamentSource"]>().mockResolvedValue(source),
    byTournament: vi
      .fn<PrizeQueries["byTournament"]>()
      .mockResolvedValue({ source: "manual", prizepool: null, prizes: [] }),
    byTeam: vi.fn<PrizeQueries["byTeam"]>().mockResolvedValue([]),
    byPlayer: vi.fn<PrizeQueries["byPlayer"]>().mockResolvedValue([]),
  };
  const transaction: PrizeTransaction = { run: (work) => work({ prizes: writer }) };
  const service = new TournamentPrizeService(reads, transaction);
  return { service, reads, writer };
}

describe("TournamentPrizeService", () => {
  it("replaces the distribution inside the competition transaction", async () => {
    const { service, writer, reads } = setup();

    await service.setDistribution("cup", [entry]);

    expect(writer.participants).toHaveBeenCalledWith("cup");
    expect(writer.replace).toHaveBeenCalledWith("cup", [entry]);
    expect(reads.byTournament).toHaveBeenCalledWith("cup");
  });

  it("rejects an unknown tournament before writing", async () => {
    const { service, writer } = setup({ exists: false });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(NotFoundError);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("rejects a team that does not take part in the tournament", async () => {
    const { service, writer } = setup({ participants: [] });
    await expect(service.setDistribution("cup", [entry])).rejects.toThrow(InvalidInputError);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("rejects a player outside the tournament roster of the team", async () => {
    const { service, writer } = setup({
      participants: [rosterA, { teamId: "team-b", playerIds: ["player-c"] }],
    });
    await expect(
      service.setDistribution("cup", [{ ...entry, playerIds: ["player-a", "player-c"] }]),
    ).rejects.toThrow(/player-c/);
    expect(writer.replace).not.toHaveBeenCalled();
  });

  it("clears a distribution even when the tournament has no participants", async () => {
    const { service, writer } = setup({ participants: [] });
    await service.setDistribution("cup", []);
    expect(writer.replace).toHaveBeenCalledWith("cup", []);
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

  it("only accepts proposals for known tournaments outside start.gg", async () => {
    await expect(setup().service.requireProposableTournament("cup")).resolves.toBeUndefined();
    await expect(
      setup({ source: null }).service.requireProposableTournament("cup"),
    ).rejects.toThrow(NotFoundError);
    await expect(
      setup({ source: "startgg" }).service.requireProposableTournament("cup"),
    ).rejects.toThrow(InvalidInputError);
  });

  it("passes the redistribution scope to the earnings reads", async () => {
    const { service, reads } = setup();
    await service.teamEarnings("team-a", { redistributableOnly: true });
    await service.playerEarnings("player-a", { redistributableOnly: false });
    expect(reads.byTeam).toHaveBeenCalledWith("team-a", { redistributableOnly: true });
    expect(reads.byPlayer).toHaveBeenCalledWith("player-a", { redistributableOnly: false });
  });
});
