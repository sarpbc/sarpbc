import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError, UnprocessableError } from "../../common/domain/errors";
import { Contract, Player, Team } from "../domain/roster";
import { ContractService } from "./contract.service";
import type { ContractQueries, ContractWriter, RosterWriteScope } from "./ports";
import {
  unusedContractQueries,
  unusedContractWriter,
  unusedPhotoWriter,
  unusedPlayerWriter,
  unusedTeamQueries,
  unusedTeamWriter,
} from "../../../test/roster-doubles";

describe("ContractService sourced career periods", () => {
  const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen", team: kc });
  const source = "https://x.com/TeamVitality/status/1";
  let career: Contract[];
  let service: ContractService;

  const contracts: ContractWriter = {
    findByPlayer: async () => career,
    findByTeam: async () => [],
    findById: async (id) => {
      const stored = career.find((contract) => contract.id === id);

      return stored ? Object.assign(new Contract(), stored) : null;
    },
    save: async (contract) => {
      contract.id ||= `contract-${career.length + 1}`;
      career = [...career.filter((stored) => stored.id !== contract.id), contract];
    },
    delete: async () => {},
  };

  const scope: RosterWriteScope = {
    players: {
      ...unusedPlayerWriter,
      findById: async (id) => (id === zen.id ? zen : null),
    },
    teams: {
      ...unusedTeamWriter,
      findById: async (id) => [vitality, kc].find((team) => team.id === id) ?? null,
    },
    contracts,
    photos: unusedPhotoWriter,
  };

  const stint = (team: Team, startDate: string, endDate: string | null) =>
    Object.assign(new Contract(), {
      id: `${team.id}-${startDate}`,
      player: zen,
      team,
      startDate: new Date(startDate),
      endDate: endDate === null ? null : new Date(endDate),
    });

  beforeEach(() => {
    career = [stint(kc, "2025-06-01", null)];
    service = new ContractService(unusedContractQueries, unusedTeamQueries, {
      run: async (work) => await work(scope),
    });
  });

  it("records a closed past period with its source on both ends", async () => {
    const contract = await service.recordPeriod("zen", {
      teamId: "vitality",
      startDate: "2022-01-10",
      endDate: "2025-05-31",
      role: "benched",
      sourceUrl: source,
    });

    expect(career).toContain(contract);
    expect(career).toHaveLength(2);
    expect(contract).toMatchObject({
      role: "benched",
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
    ).rejects.toThrow("record the move as a roster move");
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

  it("uses the unprocessable error for a missing team on creation and update", async () => {
    await expect(
      service.create("zen", { teamId: "missing", startDate: "2026-10-15" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
    await expect(
      service.update("zen", "kc-2025-06-01", { teamId: "missing" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
    expect(career).toHaveLength(1);
  });

  it("leaves the current team's departure to roster moves", async () => {
    await expect(
      service.revisePeriod("zen", "kc-2025-06-01", { endDate: "2025-12-31", sourceUrl: source }),
    ).rejects.toThrow("record the departure as a roster move");
    expect(career[0].endDate).toBeNull();
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

describe("ContractService staff contracts", () => {
  it("keeps only staff roles from a player's career", async () => {
    const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });

    const contract = (id: string, role: Contract["role"]) =>
      Object.assign(new Contract(), { id, team: kc, role, startDate: new Date("2024-01-01") });

    const career = [
      contract("player", "active"),
      contract("coach", "coach"),
      contract("analyst", "analyst"),
    ];

    const queries: ContractQueries = {
      findByPlayer: async () => career,
      findPastContractsByPlayer: async () => [],
      findByTeam: async () => [],
      findFormerPlayersByTeam: async () => [],
      findMovements: async () => [],
      findMovementsOnDay: async () => [],
    };

    const service = new ContractService(queries, unusedTeamQueries, {
      run: async (work) =>
        await work({
          players: unusedPlayerWriter,
          teams: unusedTeamWriter,
          contracts: unusedContractWriter,
          photos: unusedPhotoWriter,
        }),
    });

    const staff = await service.getStaffContractsByPlayer("zen");

    expect(staff.map(({ id }) => id)).toEqual(["coach", "analyst"]);
  });
});
