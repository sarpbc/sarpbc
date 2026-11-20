import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAliasService } from "../../application/team-alias.service";
import { Team } from "../../domain/team";
import { TeamController } from "./team.controller";
import { TeamService } from "../../application/team.service";
import { ContractService } from "../../application/contract.service";
import { SyncPandascoreTeamsUseCase } from "../../application/sync-pandascore-teams.use-case";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import type { TournamentQueries } from "../../../tournament/application/ports";
import { unconstructed } from "../../../../test/doubles";
import { tournamentQueries } from "../../../../test/competition-doubles";

describe(TeamController, () => {
  const kept = Object.assign(new Team(), { id: "kept", name: "Kept" });
  const teamQueries: Pick<TeamService, "findById"> = { findById: async () => kept };

  const contractQueries: Pick<ContractService, "getContractsByTeam" | "getFormerPlayersByTeam"> = {
    getContractsByTeam: async () => [],
    getFormerPlayersByTeam: async () => [],
  };

  const tournaments: TournamentQueries = tournamentQueries({
    getTournamentsByTeam: async () => [],
    getTournamentsWonByTeam: async () => [],
  });

  const prizeQueries: Pick<TournamentPrizeService, "teamEarnings"> = {
    teamEarnings: async () => ({ totals: [], years: [] }),
  };

  const getFormerPlayersByTeam = vi.spyOn(contractQueries, "getFormerPlayersByTeam");
  const getContractsByTeam = vi.spyOn(contractQueries, "getContractsByTeam");
  const getTournamentsWonByTeam = vi.spyOn(tournaments, "getTournamentsWonByTeam");
  const getTournamentsByTeam = vi.spyOn(tournaments, "getTournamentsByTeam");
  const teamEarnings = vi.spyOn(prizeQueries, "teamEarnings");

  const controller = new TeamController(
    Object.assign(unconstructed(TeamService), teamQueries),
    new TeamAliasService({ run: async () => await Promise.reject(new Error("unused")) }),
    Object.assign(unconstructed(ContractService), contractQueries),
    tournaments,
    Object.assign(unconstructed(TournamentPrizeService), prizeQueries),
    unconstructed(SyncPandascoreTeamsUseCase),
  );

  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(teamEarnings).toHaveBeenCalledWith("kept");
  });
});
