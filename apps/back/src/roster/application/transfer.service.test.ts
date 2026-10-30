import { describe, expect, it, vi } from "vitest";
import { Contract, ContractRole, Player, Team } from "../domain/roster";
import type { ContractQueries } from "./ports";
import { TransferService } from "./transfer.service";

describe("TransferService", () => {
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const now = new Date("2026-10-30");
  const contract = (
    id: string,
    team: Team,
    startDate: string,
    endDate: string | null,
    role = ContractRole.ACTIVE,
  ) =>
    Object.assign(new Contract(), {
      id,
      player: zen,
      team,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      role,
    });
  const career = [
    contract("v", vitality, "2022-01-10", "2025-06-01"),
    contract("k", kc, "2025-06-01", "2026-03-01"),
    contract("kb", kc, "2026-03-01", null, ContractRole.BENCHED),
  ];

  function fixture() {
    const findMovements = vi.fn().mockResolvedValue(career);
    const contracts: ContractQueries = {
      findByPlayer: async () => [],
      findPastContractsByPlayer: async () => [],
      findByTeam: async () => [],
      findFormerPlayersByTeam: async () => [],
      findMovements,
    };
    const service = new TransferService(contracts);
    return { findMovements, service };
  }

  it("passes the team, player and period to the store", async () => {
    const { findMovements, service } = fixture();
    const from = new Date("2025-01-01");
    const to = new Date("2025-12-31");

    await service.findAndCount(
      { teamId: "kc", playerId: "zen", from, to, limit: 5, offset: 0 },
      now,
    );

    expect(findMovements).toHaveBeenCalledWith({ teamId: "kc", playerId: "zen", from, to });
  });

  it("filters by movement type and paginates the newest movements first", async () => {
    const { service } = fixture();

    const [page, count] = await service.findAndCount({ limit: 2, offset: 1 }, now);
    expect(count).toBe(4);
    expect(page.map(({ id }) => id)).toEqual(["k:join", "v:leave"]);

    const [departures] = await service.findAndCount(
      { type: "departure", limit: 25, offset: 0 },
      now,
    );
    expect(departures.map(({ id }) => id)).toEqual(["v:leave"]);
  });

  it("drops edge movements of loaded contracts that fall outside the period", async () => {
    const { service } = fixture();

    const [transfers, count] = await service.findAndCount(
      { from: new Date("2026-01-01"), to: new Date("2026-12-31"), limit: 25, offset: 0 },
      now,
    );

    expect(count).toBe(1);
    expect(transfers[0]).toMatchObject({ id: "kb:join", type: "benched" });
  });
});
