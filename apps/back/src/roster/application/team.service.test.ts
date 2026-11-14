import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract, Player, Team } from "../domain/roster";
import type { TeamCompetitionReferences } from "../domain/team-deletion";
import type { RosterTransaction, RosterWriteScope, TeamQueries } from "./ports";
import { TeamService } from "./team.service";
import { ConflictError, InvalidInputError } from "../../common/domain/errors";

describe("Roster workflows", () => {
  let stores: RosterWriteScope;
  let service: TeamService;
  let team: Team;
  let player: Player;
  let contract: Contract;
  let transactions: number;
  let competition: TeamCompetitionReferences;

  beforeEach(() => {
    team = Object.assign(new Team(), { id: "team" });
    player = Object.assign(new Player(), { id: "player", team });
    contract = Object.assign(new Contract(), { id: "contract", team, player });
    team.players = [player];
    stores = {
      teams: {
        findById: async () => team,
        findBySlug: vi.fn(),
        redirectCount: async () => 0,
        save: vi.fn(),
        delete: vi.fn(),
      },
      players: {
        findById: async () => player,
        findBySlug: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
      photos: {
        findByPlayer: vi.fn(),
        findById: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
      contracts: {
        findByPlayer: vi.fn(),
        findByTeam: async () => [contract],
        findById: async () => contract,
        save: vi.fn(),
        delete: vi.fn(),
      },
    };
    transactions = 0;

    const transaction: RosterTransaction = {
      run: async (work) => {
        transactions += 1;

        return work(stores);
      },
    };

    competition = { participations: 0, matches: 0, prizes: 0 };

    const queries: TeamQueries = {
      search: vi.fn(),
      searchAndCount: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
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
    expect(stores.teams.delete).toHaveBeenCalledExactlyOnceWith(team);
  });

  it("refuses to delete a team that still has players and contracts", async () => {
    await expect(service.delete(team.id)).rejects.toThrow(
      "still has 1 current player, 1 contract.",
    );
    expect(player.team).toBe(team);
    expect(stores.contracts.delete).not.toHaveBeenCalled();
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("names every competition reference that blocks a deletion", async () => {
    emptyTeam();
    competition = { participations: 2, matches: 5, prizes: 1 };
    await expect(service.delete(team.id)).rejects.toThrow(
      "2 tournament participations, 5 matches, 1 prize",
    );
    await expect(service.requireDeletable(team.id)).rejects.toBeInstanceOf(ConflictError);
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("keeps a team other duplicates were merged into", async () => {
    emptyTeam();
    stores.teams.redirectCount = async () => 1;
    await expect(service.delete(team.id)).rejects.toThrow("1 merged duplicate");
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a PandaScore team even when it is empty", async () => {
    emptyTeam();
    team.source = "pandascore";
    team.pandascoreId = 128;
    await expect(service.delete(team.id)).rejects.toThrow("synced from PandaScore");
    await expect(service.requireDeletable(team.id)).rejects.toBeInstanceOf(InvalidInputError);
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("keeps a merged duplicate as its redirect", async () => {
    emptyTeam();
    team.mergedIntoId = "kept";
    await expect(service.delete(team.id)).rejects.toThrow("kept as its redirect");
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("checks a deletion without deleting", async () => {
    emptyTeam();
    await service.requireDeletable(team.id);
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("does not delete anything when the team is missing", async () => {
    stores.teams.findById = async () => null;
    await expect(service.delete("missing")).rejects.toThrow("not found");
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("keeps a team with current players active", async () => {
    await expect(service.update(team.id, { active: false })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(team.active).toBe(true);
    expect(stores.teams.save).not.toHaveBeenCalled();
  });

  it("marks an empty team inactive without deleting it", async () => {
    team.players = [];
    expect((await service.update(team.id, { active: false })).active).toBe(false);
    expect(stores.teams.save).toHaveBeenCalledWith(team);
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("rejects a team whose slug is already taken", async () => {
    stores.teams.findBySlug = async () => team;
    await expect(service.create({ name: "Vitality" })).rejects.toBeInstanceOf(ConflictError);
    expect(stores.teams.save).not.toHaveBeenCalled();
  });
});
