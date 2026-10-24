import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract, Player, Team } from "../domain/roster";
import { ContractService } from "./contract.service";
import type { ContractQueries, RosterTransaction, RosterWriteScope, TeamQueries } from "./ports";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";
import { TeamService } from "./team.service";
import { ConflictError, InvalidInputError, UnprocessableError } from "../../common/domain/errors";

describe("Roster workflows", () => {
  let stores: RosterWriteScope;
  let service: TeamService;
  let contractService: ContractService;
  let team: Team;
  let player: Player;
  let contract: Contract;
  let transactions: number;

  beforeEach(() => {
    team = Object.assign(new Team(), { id: "team" });
    player = Object.assign(new Player(), { id: "player", team });
    contract = Object.assign(new Contract(), { id: "contract", team, player });
    team.players = [player];
    stores = {
      teams: {
        findById: async () => team,
        findBySlug: vi.fn(),
        findWithPlayers: async () => team,
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
    contractService = new ContractService({} as ContractQueries, {} as TeamQueries, transaction);
    const sync = new SyncPandascoreTeamsUseCase(
      { hasTeams: async () => false, syncCurrentTeams: async () => {} },
      { load: async () => [] },
    );
    service = new TeamService({} as TeamQueries, transaction, sync);
  });

  it("deletes contracts and clears current membership with the team in one transaction", async () => {
    await service.delete(team.id);
    expect(transactions).toBe(1);
    expect(stores.contracts.delete).toHaveBeenCalledWith(contract);
    expect(player.team).toBeNull();
    expect(stores.players.save).toHaveBeenCalledWith(player);
    expect(stores.teams.delete).toHaveBeenCalledWith(team);
  });

  it("does not mutate contracts or memberships when the team is missing", async () => {
    stores.teams.findWithPlayers = async () => null;
    await expect(service.delete("missing")).rejects.toThrow("not found");
    expect(player.team).toBe(team);
    expect(stores.contracts.delete).not.toHaveBeenCalled();
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

  it("uses the unprocessable error for missing contract teams on creation and update", async () => {
    stores.teams.findById = async () => null;
    await expect(
      contractService.create(player.id, { teamId: "missing", startDate: "2026-10-15" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
    await expect(
      contractService.update(player.id, contract.id, { teamId: "missing" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
    expect(stores.contracts.save).not.toHaveBeenCalled();
  });
});
