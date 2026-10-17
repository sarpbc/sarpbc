import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract, Player, Team } from "../../player/domain/roster";
import { ContractService } from "../../player/application/contract.service";
import { PlayerService } from "../../player/application/player.service";
import type {
  RosterStores,
  RosterTransaction,
} from "../../player/application/ports/roster-transaction";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";
import { TeamService } from "./team.service";
import { UnprocessableError } from "../../common/domain/errors";

describe("Roster workflows", () => {
  let stores: RosterStores;
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
        search: vi.fn(),
        searchAndCount: vi.fn(),
        findById: async () => team,
        findBySlug: vi.fn(),
        findWithPlayers: async () => team,
        findAllTeams: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
      players: {
        search: vi.fn(),
        searchAndCount: vi.fn(),
        findById: async () => player,
        findBySlug: vi.fn(),
        getRandomPlayer: vi.fn(),
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
        findPastContractsByPlayer: vi.fn(),
        findByTeam: async () => [contract],
        findFormerPlayersByTeam: vi.fn(),
        findById: async () => contract,
        findActiveContract: vi.fn(),
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
    contractService = new ContractService(stores.contracts, stores.players, stores.teams);
    const players = new PlayerService(stores.players, stores.photos, stores.teams, transaction);
    const sync = new SyncPandascoreTeamsUseCase(
      { hasTeams: async () => false, syncCurrentTeams: async () => {} },
      { load: async () => [] },
    );
    service = new TeamService(stores.teams, transaction, players, sync);
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
