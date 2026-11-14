import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAliasService } from "../../application/team-alias.service";
import { Team } from "../../domain/roster";
import { TeamController } from "./team.controller";
import { TeamService } from "../../application/team.service";
import { ContractService } from "../../application/contract.service";
import { SyncPandascoreTeamsUseCase } from "../../application/sync-pandascore-teams.use-case";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import type { TournamentQueries } from "../../../tournament/application/ports";
import { unconstructed } from "../../../../test/doubles";
import { unusedTournamentQueries } from "../../../../test/unused-tournament-queries";

describe("TeamController", () => {
  const kept = Object.assign(new Team(), { id: "kept", name: "Kept" });
  const findById = vi.fn();
  const getFormerPlayersByTeam = vi.fn();
  const getContractsByTeam = vi.fn();
  const getTournamentsWonByTeam = vi.fn();
  const getTournamentsByTeam = vi.fn();
  const teamEarnings = vi.fn();

  const tournaments: TournamentQueries = {
    ...unusedTournamentQueries,
    getTournamentsByTeam,
    getTournamentsWonByTeam,
  };

  const controller = new TeamController(
    Object.assign(unconstructed(TeamService), { findById }),
    new TeamAliasService({ run: async () => await Promise.reject(new Error("unused")) }),
    Object.assign(unconstructed(ContractService), { getFormerPlayersByTeam, getContractsByTeam }),
    tournaments,
    Object.assign(unconstructed(TournamentPrizeService), { teamEarnings }),
    unconstructed(SyncPandascoreTeamsUseCase),
  );

  beforeEach(() => {
    vi.resetAllMocks();
    findById.mockResolvedValue(kept);
    getFormerPlayersByTeam.mockResolvedValue([]);
    getContractsByTeam.mockResolvedValue([]);
    getTournamentsWonByTeam.mockResolvedValue([]);
    getTournamentsByTeam.mockResolvedValue([]);
    teamEarnings.mockResolvedValue({ totals: [], years: [] });
  });

  it("reads the sub-resources of the team a merged id resolves to", async () => {
    await controller.getTrophies("merged");
    await controller.getTournaments("merged");
    await controller.getFormerPlayers("merged");
    await controller.getContracts("merged");
    await controller.getEarnings("merged");

    expect(getTournamentsWonByTeam).toHaveBeenCalledWith("kept");
    expect(getTournamentsByTeam).toHaveBeenCalledWith("kept");
    expect(getFormerPlayersByTeam).toHaveBeenCalledWith("kept");
    expect(getContractsByTeam).toHaveBeenCalledWith("kept");
    expect(teamEarnings).toHaveBeenCalledWith("kept", { redistributableOnly: false });
  });
});
