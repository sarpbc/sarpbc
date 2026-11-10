import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../domain/roster";
import { PlayerController } from "./player.controller";

describe("PlayerController", () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  const players = { findById: vi.fn() };
  const contracts = {
    getContractsByPlayer: vi.fn(),
    getOldTeamsByPlayer: vi.fn(),
    getStaffContractsByPlayer: vi.fn(),
  };
  const matches = { getMatchesByPlayer: vi.fn() };
  const tournaments = {
    getTournamentsWonByPlayer: vi.fn(),
    getTournamentsByPlayer: vi.fn(),
    getTournamentsByTeamTenures: vi.fn(),
  };
  const awards = { findByPlayerId: vi.fn() };
  const playerEarnings = vi.fn();
  const prizes = { playerEarnings } as never;
  const controller = new PlayerController(
    players as never,
    contracts as never,
    matches as never,
    tournaments as never,
    awards as never,
    prizes,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    players.findById.mockResolvedValue(kept);
    contracts.getContractsByPlayer.mockResolvedValue([]);
    contracts.getOldTeamsByPlayer.mockResolvedValue([]);
    contracts.getStaffContractsByPlayer.mockResolvedValue([]);
    matches.getMatchesByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsWonByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByTeamTenures.mockResolvedValue([]);
    awards.findByPlayerId.mockResolvedValue([]);
    playerEarnings.mockResolvedValue({ totals: [], years: [] });
  });

  it("reads the sub-resources of the player a merged id resolves to", async () => {
    await controller.getContracts("merged");
    await controller.getOldTeams("merged");
    await controller.getTrophies("merged");
    await controller.getAwards("merged");
    await controller.getEarnings("merged");
    await controller.getTournaments("merged");
    await controller.getMatches("merged");
    await controller.getStaffTournaments("merged");

    expect(contracts.getContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getOldTeamsByPlayer).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsWonByPlayer).toHaveBeenCalledWith("kept");
    expect(awards.findByPlayerId).toHaveBeenCalledWith("kept");
    expect(playerEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
    expect(tournaments.getTournamentsByPlayer).toHaveBeenCalledWith("kept");
    expect(matches.getMatchesByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getStaffContractsByPlayer).toHaveBeenCalledWith("kept");
  });

  it("looks up tournaments over each staff tenure", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");
    contracts.getStaffContractsByPlayer.mockResolvedValue([
      { team: { id: "kc" }, startDate: from, endDate: to },
      { team: { id: "vit" }, startDate: to, endDate: null },
    ]);

    await controller.getStaffTournaments("kept");

    expect(tournaments.getTournamentsByTeamTenures).toHaveBeenCalledWith([
      { teamId: "kc", from, to },
      { teamId: "vit", from: to, to: null },
    ]);
  });
});
