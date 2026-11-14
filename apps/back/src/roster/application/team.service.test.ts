import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Contract } from "../domain/contract";
import { Player } from "../domain/player";
import { Team } from "../domain/team";
import type { TeamCompetitionReferences } from "../domain/team-deletion";
import type { RosterTransaction, RosterWriteScope, TeamQueries } from "./ports";
import { TeamService } from "./team.service";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

describe("Roster workflows", () => {
  let stores: RosterWriteScope;
  let service: TeamService;
  let team: Team;
  let player: Player;
  let contract: Contract;
  let transactions: number;
  let saveTeam: Mock<RosterWriteScope["teams"]["save"]>;
  let deleteTeam: Mock<RosterWriteScope["teams"]["delete"]>;
  let deleteContract: Mock<RosterWriteScope["contracts"]["delete"]>;
  let competition: TeamCompetitionReferences;

  beforeEach(() => {
    team = Object.assign(new Team(), { id: "team" });
    player = Object.assign(new Player(), { id: "player", team });
    contract = Object.assign(new Contract(), { id: "contract", team, player });
    team.players = [player];
    saveTeam = vi.fn<RosterWriteScope["teams"]["save"]>();
    deleteTeam = vi.fn<RosterWriteScope["teams"]["delete"]>();
    deleteContract = vi.fn<RosterWriteScope["contracts"]["delete"]>();
    stores = {
      teams: {
        findById: async () => team,
        findBySlug: vi.fn<RosterWriteScope["teams"]["findBySlug"]>(),
        redirectCount: async () => 0,
        save: saveTeam,
        delete: deleteTeam,
      },
      players: {
        findById: async () => player,
        findBySlug: vi.fn<RosterWriteScope["players"]["findBySlug"]>(),
        save: vi.fn<RosterWriteScope["players"]["save"]>(),
        delete: vi.fn<RosterWriteScope["players"]["delete"]>(),
      },
      photos: {
        findByPlayer: vi.fn<RosterWriteScope["photos"]["findByPlayer"]>(),
        findById: vi.fn<RosterWriteScope["photos"]["findById"]>(),
        save: vi.fn<RosterWriteScope["photos"]["save"]>(),
        delete: vi.fn<RosterWriteScope["photos"]["delete"]>(),
      },
      contracts: {
        findByPlayer: vi.fn<RosterWriteScope["contracts"]["findByPlayer"]>(),
        findByTeam: async () => [contract],
        findById: async () => contract,
        save: vi.fn<RosterWriteScope["contracts"]["save"]>(),
        delete: deleteContract,
      },
    };
    transactions = 0;

    const transaction: RosterTransaction = {
      run: async (work) => {
        transactions += 1;

        return await work(stores);
      },
    };

    competition = { participations: 0, matches: 0, prizes: 0 };

    const queries: TeamQueries = {
      search: vi.fn<TeamQueries["search"]>(),
      searchAndCount: vi.fn<TeamQueries["searchAndCount"]>(),
      findById: vi.fn<TeamQueries["findById"]>(),
      findBySlug: vi.fn<TeamQueries["findBySlug"]>(),
    };

    service = new TeamService(queries, transaction, {
      teamReferences: async () => competition,
    });
  });

  const emptyTeam = () => {
    team.players = [];
    stores.contracts.findByTeam = async () => [];
  };

  it("deletes an unreferenced manual team in one transaction", async () => {
    emptyTeam();
    await service.delete(team.id);
    expect(transactions).toBe(1);
    expect(deleteTeam).toHaveBeenCalledExactlyOnceWith(team);
  });

  it("refuses to delete a team that still has players and contracts", async () => {
    await expect(service.delete(team.id)).rejects.toThrow(
      "still has 1 current player, 1 contract.",
    );
    expect(player.team).toBe(team);
    expect(deleteContract).not.toHaveBeenCalled();
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("names every competition reference that blocks a deletion", async () => {
    emptyTeam();
    competition = { participations: 2, matches: 5, prizes: 1 };
    await expect(service.delete(team.id)).rejects.toThrow(
      "2 tournament participations, 5 matches, 1 prize",
    );
    await expect(service.requireDeletable(team.id)).rejects.toBeInstanceOf(ConflictError);
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("keeps a team other duplicates were merged into", async () => {
    emptyTeam();
    stores.teams.redirectCount = async () => 1;
    await expect(service.delete(team.id)).rejects.toThrow("1 merged duplicate");
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("refuses to delete a PandaScore team even when it is empty", async () => {
    emptyTeam();
    team.source = "pandascore";
    team.pandascoreId = 128;
    await expect(service.delete(team.id)).rejects.toThrow("synced from PandaScore");
    await expect(service.requireDeletable(team.id)).rejects.toBeInstanceOf(InvalidInputError);
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("keeps a merged duplicate as its redirect", async () => {
    emptyTeam();
    team.mergedIntoId = "kept";
    await expect(service.delete(team.id)).rejects.toThrow("kept as its redirect");
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("checks a deletion without deleting", async () => {
    emptyTeam();
    await service.requireDeletable(team.id);
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("does not delete anything when the team is missing", async () => {
    stores.teams.findById = async () => null;
    await expect(service.delete("missing")).rejects.toThrow("not found");
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("keeps a team with current players active", async () => {
    await expect(service.update(team.id, { active: false })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(team.active).toBe(true);
    expect(saveTeam).not.toHaveBeenCalled();
  });

  it("marks an empty team inactive without deleting it", async () => {
    team.players = [];
    const updateResult = await service.update(team.id, { active: false });
    expect(updateResult.active).toBe(false);
    expect(saveTeam).toHaveBeenCalledWith(team);
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("rejects a team whose slug is already taken", async () => {
    stores.teams.findBySlug = async () => team;
    await expect(service.create({ name: "Vitality" })).rejects.toBeInstanceOf(ConflictError);
    expect(saveTeam).not.toHaveBeenCalled();
  });
});
