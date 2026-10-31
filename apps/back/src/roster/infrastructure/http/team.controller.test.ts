import { beforeEach, describe, expect, it, vi } from "vitest";
import { Team } from "../../domain/roster";
import { TeamController } from "./team.controller";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";

describe("TeamController", () => {
  const kept = Object.assign(new Team(), { id: "kept", name: "Kept" });
  const teams = { findById: vi.fn() };
  const contracts = { getFormerPlayersByTeam: vi.fn(), getContractsByTeam: vi.fn() };
  const tournaments = { getTournamentsWonByTeam: vi.fn(), getTournamentsByTeam: vi.fn() };
  const prizes = new TournamentPrizeService(
    { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
    { run: vi.fn() },
    { invalidateTournament: vi.fn() },
    { error: vi.fn() },
  );
  const teamEarnings = vi.spyOn(prizes, "teamEarnings");
  const controller = new TeamController(
    teams as never,
    contracts as never,
    tournaments as never,
    prizes,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    teams.findById.mockResolvedValue(kept);
    contracts.getFormerPlayersByTeam.mockResolvedValue([]);
    contracts.getContractsByTeam.mockResolvedValue([]);
    tournaments.getTournamentsWonByTeam.mockResolvedValue([]);
    tournaments.getTournamentsByTeam.mockResolvedValue([]);
    teamEarnings.mockResolvedValue({ totals: [], years: [] });
  });

  it("reads the sub-resources of the team a merged id resolves to", async () => {
    await controller.getTrophies("merged");
    await controller.getTournaments("merged");
    await controller.getFormerPlayers("merged");
    await controller.getContracts("merged");
    await controller.getEarnings("merged");

    expect(tournaments.getTournamentsWonByTeam).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsByTeam).toHaveBeenCalledWith("kept");
    expect(contracts.getFormerPlayersByTeam).toHaveBeenCalledWith("kept");
    expect(contracts.getContractsByTeam).toHaveBeenCalledWith("kept");
    expect(teamEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
  });
});
