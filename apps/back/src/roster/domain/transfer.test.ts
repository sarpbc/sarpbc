import { describe, expect, it } from "vitest";
import { Contract, ContractRole, Player, Team } from "./roster";
import { deriveTransfers } from "./transfer";

describe("deriveTransfers", () => {
  const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const today = new Date("2026-10-30");

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
      joinSourceUrl: `https://x.com/${id}/join`,
      leaveSourceUrl: endDate ? `https://x.com/${id}/leave` : null,
    });

  const summary = (contracts: Contract[], until = today) =>
    deriveTransfers(contracts, until).map(({ type, date, contract }) => [
      type,
      date.toISOString().slice(0, 10),
      contract.team.id,
    ]);

  it("turns a move between teams into a departure and an arrival, newest first", () => {
    expect(
      summary([
        contract("v", vitality, "2022-01-10", "2025-06-01"),
        contract("k", kc, "2025-06-01", null),
      ]),
    ).toEqual([
      ["arrival", "2025-06-01", "kc"],
      ["departure", "2025-06-01", "vitality"],
      ["arrival", "2022-01-10", "vitality"],
    ]);
  });

  it("reports benching and loans by the role of the contract that starts", () => {
    expect(
      summary([
        contract("starter", kc, "2024-01-01", "2025-03-01"),
        contract("bench", kc, "2025-03-01", "2025-08-01", ContractRole.BENCHED),
        contract("loan", vitality, "2025-04-01", "2025-07-01", ContractRole.LOANED),
      ]),
    ).toEqual([
      ["departure", "2025-08-01", "kc"],
      ["departure", "2025-07-01", "vitality"],
      ["loan", "2025-04-01", "vitality"],
      ["benched", "2025-03-01", "kc"],
      ["arrival", "2024-01-01", "kc"],
    ]);
  });

  it("treats a return from the bench as an arrival without a departure", () => {
    expect(
      summary([
        contract("bench", kc, "2025-01-01", "2025-05-01", ContractRole.BENCHED),
        contract("starter", kc, "2025-05-01", null),
      ]),
    ).toEqual([
      ["arrival", "2025-05-01", "kc"],
      ["benched", "2025-01-01", "kc"],
    ]);
  });

  it("keeps the source of each end of a contract", () => {
    const [departure, arrival] = deriveTransfers(
      [contract("v", vitality, "2022-01-10", "2025-06-01")],
      today,
    );
    expect(departure).toMatchObject({ id: "v:leave", sourceUrl: "https://x.com/v/leave" });
    expect(arrival).toMatchObject({ id: "v:join", sourceUrl: "https://x.com/v/join" });
  });

  it("leaves out movements dated after the reference day", () => {
    expect(summary([contract("k", kc, "2026-11-15", null)])).toEqual([]);
    expect(summary([contract("v", vitality, "2026-01-01", "2026-12-01")])).toEqual([
      ["arrival", "2026-01-01", "vitality"],
    ]);
  });
});
