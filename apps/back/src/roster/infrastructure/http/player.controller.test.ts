import { beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../domain/roster";
import { PlayerController } from "./player.controller";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";

describe("PlayerController", () => {
  const kept = Object.assign(new Player(), { id: "kept", name: "Kept" });
  const players = { findById: vi.fn() };
  const contracts = { getContractsByPlayer: vi.fn(), getOldTeamsByPlayer: vi.fn() };
  const matches = { getMatchesByPlayer: vi.fn() };
  const tournaments = { getTournamentsWonByPlayer: vi.fn(), getTournamentsByPlayer: vi.fn() };
  const awards = { findByPlayerId: vi.fn() };
  const prizes = new TournamentPrizeService(
    { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
    { run: vi.fn() },
  );
  const playerEarnings = vi.spyOn(prizes, "playerEarnings");
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
    matches.getMatchesByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsWonByPlayer.mockResolvedValue([]);
    tournaments.getTournamentsByPlayer.mockResolvedValue([]);
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

    expect(contracts.getContractsByPlayer).toHaveBeenCalledWith("kept");
    expect(contracts.getOldTeamsByPlayer).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsWonByPlayer).toHaveBeenCalledWith("kept");
    expect(awards.findByPlayerId).toHaveBeenCalledWith("kept");
    expect(playerEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
    expect(tournaments.getTournamentsByPlayer).toHaveBeenCalledWith("kept");
    expect(matches.getMatchesByPlayer).toHaveBeenCalledWith("kept");
  });
});
