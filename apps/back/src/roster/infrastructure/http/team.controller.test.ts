import { beforeEach, describe, expect, it, vi } from "vitest";
import { Team } from "../../domain/roster";
import { TeamController } from "./team.controller";

describe("TeamController", () => {
  const kept = Object.assign(new Team(), { id: "kept", name: "Kept" });
  const teams = { findById: vi.fn() };
  const contracts = { getFormerPlayersByTeam: vi.fn(), getContractsByTeam: vi.fn() };
  const tournaments = { getTournamentsWonByTeam: vi.fn(), getTournamentsByTeam: vi.fn() };
  const controller = new TeamController(teams as never, contracts as never, tournaments as never);

  beforeEach(() => {
    vi.resetAllMocks();
    teams.findById.mockResolvedValue(kept);
    contracts.getFormerPlayersByTeam.mockResolvedValue([]);
    contracts.getContractsByTeam.mockResolvedValue([]);
    tournaments.getTournamentsWonByTeam.mockResolvedValue([]);
    tournaments.getTournamentsByTeam.mockResolvedValue([]);
  });

  it("reads the sub-resources of the team a merged id resolves to", async () => {
    await controller.getTrophies("merged");
    await controller.getTournaments("merged");
    await controller.getFormerPlayers("merged");
    await controller.getContracts("merged");

    expect(tournaments.getTournamentsWonByTeam).toHaveBeenCalledWith("kept");
    expect(tournaments.getTournamentsByTeam).toHaveBeenCalledWith("kept");
    expect(contracts.getFormerPlayersByTeam).toHaveBeenCalledWith("kept");
    expect(contracts.getContractsByTeam).toHaveBeenCalledWith("kept");
  });
});
