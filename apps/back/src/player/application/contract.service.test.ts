import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { Contract, ContractRole, Player, Team } from "../domain/roster";
import { ContractService } from "./contract.service";
import type { RosterStores } from "./ports/roster-transaction";

describe("ContractService sourced career periods", () => {
  const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen", team: kc });
  const source = "https://x.com/TeamVitality/status/1";
  let career: Contract[];
  let service: ContractService;

  const contracts: RosterStores["contracts"] = {
    findByPlayer: async () => career,
    findPastContractsByPlayer: async () => [],
    findByTeam: async () => [],
    findFormerPlayersByTeam: async () => [],
    findById: async (id) => career.find((contract) => contract.id === id) ?? null,
    findActiveContract: async () => null,
    save: async (contract) => {
      if (!contract.id) {
        contract.id = `contract-${career.length + 1}`;
        career.push(contract);
      }
    },
    delete: async () => {},
  };
  const players = {
    findById: async (id: string) => (id === zen.id ? zen : null),
  } as RosterStores["players"];
  const teams = {
    findById: async (id: string) => [vitality, kc].find((team) => team.id === id) ?? null,
  } as RosterStores["teams"];

  const stint = (team: Team, startDate: string, endDate: string | null) =>
    Object.assign(new Contract(), {
      id: `${team.id}-${startDate}`,
      player: zen,
      team,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    });

  beforeEach(() => {
    career = [stint(kc, "2025-06-01", null)];
    service = new ContractService(contracts, players, teams);
  });

  it("records a closed past period with its source on both ends", async () => {
    const contract = await service.recordPeriod("zen", {
      teamId: "vitality",
      startDate: "2022-01-10",
      endDate: "2025-05-31",
      role: ContractRole.BENCHED,
      sourceUrl: source,
    });

    expect(career).toContain(contract);
    expect(contract).toMatchObject({
      role: ContractRole.BENCHED,
      joinSourceUrl: source,
      leaveSourceUrl: source,
    });
  });

  it("only leaves the current team's contract open", async () => {
    await expect(
      service.recordPeriod("zen", {
        teamId: "vitality",
        startDate: "2022-01-10",
        sourceUrl: source,
      }),
    ).rejects.toThrow("add_player_to_team");
    expect(career).toHaveLength(1);
  });

  it("rejects a period that overlaps a contract with the same team", async () => {
    await expect(
      service.recordPeriod("zen", {
        teamId: "kc",
        startDate: "2024-01-01",
        endDate: "2025-07-01",
        sourceUrl: source,
      }),
    ).rejects.toThrow('overlaps contract "kc-2025-06-01"');
  });

  it("accepts back-to-back stints and rejects inverted dates", async () => {
    await service.recordPeriod("zen", {
      teamId: "kc",
      startDate: "2024-01-01",
      endDate: "2025-06-01",
      sourceUrl: source,
    });

    await expect(
      service.recordPeriod("zen", {
        teamId: "vitality",
        startDate: "2023-01-01",
        endDate: "2022-01-01",
        sourceUrl: source,
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  it("revises a period and re-sources only the edited end", async () => {
    career.push(stint(vitality, "2022-01-10", "2025-05-31"));

    const revised = await service.revisePeriod("zen", "vitality-2022-01-10", {
      endDate: "2025-05-15",
      sourceUrl: source,
    });

    expect(revised).toMatchObject({ joinSourceUrl: null, leaveSourceUrl: source });
    expect(revised.endDate).toEqual(new Date("2025-05-15"));
    await expect(
      service.revisePeriod("zen", "vitality-2022-01-10", { endDate: null, sourceUrl: source }),
    ).rejects.toThrow("current team");
  });
});
