import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../domain/roster";
import { PlayerController } from "./player.controller";

describe("PlayerController", () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  const players = { findById: vi.fn() };
  const contracts = { getContractsByPlayer: vi.fn(), getOldTeamsByPlayer: vi.fn() };
  const matches = { getMatchesByPlayer: vi.fn() };
  const tournaments = { getTournamentsWonByPlayer: vi.fn(), getTournamentsByPlayer: vi.fn() };
  const awards = { findByPlayerId: vi.fn() };
  const controller = new PlayerController(
    players as never,
    contracts as never,
    matches as never,
    tournaments as never,
    awards as never,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    players.findById.mockResolvedValue(kept);
    contracts.getContractsByPlayer.mockResolvedValue([]);
    contracts.getOldTeamsByPlayer.mockResolvedValue([]);
    matches.getMatchesByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsWonByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByPlayer.mockResolvedValue([]);
    awards.findByPlayerId.mockResolvedValue([]);
  });

  it("reads the sub-resources of the player a merged id resolves to", async () => {
    await controller.getContracts("merged");
    await controller.getOldTeams("merged");
    await controller.getTrophies("merged");
    await controller.getAwards("merged");
    await controller.getTournaments("merged");
    await controller.getMatches("merged");

    expect(contracts.getContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getOldTeamsByPlayer).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsWonByPlayer).toHaveBeenCalledWith("kept");
    expect(awards.findByPlayerId).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsByPlayer).toHaveBeenCalledWith("kept");
    expect(matches.getMatchesByPlayer).toHaveBeenCalledWith("kept");
  });
});
