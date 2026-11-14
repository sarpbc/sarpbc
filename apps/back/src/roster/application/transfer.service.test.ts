import { describe, expect, it } from "vitest";
import { Contract } from "../domain/contract";
import { Player } from "../domain/player";
import { Team } from "../domain/team";
import type { ContractQueries } from "./ports";
import { TransferService } from "./transfer.service";

describe(TransferService, () => {
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const now = new Date("2026-10-30");

  const contract = (
    id: string,
    team: Team,
    startDate: string,
    endDate: string | null,
    role = "active",
  ) =>
    Object.assign(new Contract(), {
      id,
      player: zen,
      team,
      startDate: new Date(startDate),
      endDate: endDate === null ? null : new Date(endDate),
      role,
    });

  const career = [
    contract("v", vitality, "2022-01-10", "2025-06-01"),
    contract("k", kc, "2025-06-01", "2026-03-01"),
    contract("kb", kc, "2026-03-01", null, "benched"),
  ];

  const findMovements = async () => career;

  function fixture() {
    const contracts: ContractQueries = {
      findByPlayer: async () => [],
      findPastContractsByPlayer: async () => [],
      findByTeam: async () => [],
      findFormerPlayersByTeam: async () => [],
      findMovements,
      findMovementsOnDay: findMovements,
    };

    const service = new TransferService(contracts);

    return { service };
  }

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

  it("keeps the derived movements of a month and day, without same-team renewals", async () => {
    const { service } = fixture();

    const june = await service.onDay(6, 1, now);
    expect(june.map(({ id }) => id).toSorted()).toEqual(["k:join", "v:leave"]);

    const march = await service.onDay(3, 1, now);
    expect(march.map(({ id, type }) => [id, type])).toEqual([["kb:join", "benched"]]);

    await expect(service.onDay(1, 10, new Date("2021-12-31"))).resolves.toEqual([]);
  });
});
