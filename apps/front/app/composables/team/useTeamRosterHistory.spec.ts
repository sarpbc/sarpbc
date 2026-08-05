import { describe, expect, it } from "vitest";
import type { ContractRole, TeamContract } from "~/types/contract";
import { buildTeamRosterEras } from "~/composables/team/useTeamRosterHistory";

const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();

function makeContract(
  overrides: Partial<TeamContract> & {
    id: string;
    playerId: string;
    playerName: string;
    startDate: string;
    endDate?: string | null;
    role?: ContractRole;
  },
): TeamContract {
  return {
    id: overrides.id,
    startDate: overrides.startDate,
    endDate: overrides.endDate ?? null,
    role: overrides.role ?? "active",
    createdAt: overrides.startDate,
    player: {
      id: overrides.playerId,
      name: overrides.playerName,
      slug: overrides.playerId,
      firstName: null,
      lastName: null,
      imageUrl: null,
      nationality: null,
      birthday: null,
    },
  };
}

describe("buildTeamRosterEras", () => {
  it("returns empty array for no contracts", () => {
    expect(buildTeamRosterEras([], NOW)).toEqual([]);
  });

  it("builds a single current era for one open contract", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(1);
    expect(eras[0]?.isCurrent).toBe(true);
    expect(eras[0]?.end).toBeNull();
    expect(eras[0]?.members.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[0]?.joined.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[0]?.left).toEqual([]);
  });

  it("records joined and left across a clean roster swap", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-03-01T00:00:00.000Z",
        }),
        makeContract({
          id: "c2",
          playerId: "p2",
          playerName: "Bravo",
          startDate: "2026-03-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(2);
    expect(eras[0]?.members.map((member) => member.playerId)).toEqual(["p2"]);
    expect(eras[0]?.joined.map((member) => member.playerId)).toEqual(["p2"]);
    expect(eras[0]?.left.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[1]?.members.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[1]?.joined.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[1]?.left).toEqual([]);
  });

  it("returns eras in reverse chronological order", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-02-01T00:00:00.000Z",
        }),
        makeContract({
          id: "c2",
          playerId: "p2",
          playerName: "Bravo",
          startDate: "2026-03-01T00:00:00.000Z",
          endDate: "2026-04-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras.map((era) => era.start)).toEqual([
      "2026-03-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
  });

  it("merges adjacent eras when roster and roles are unchanged", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-06-01T00:00:00.000Z",
        }),
        makeContract({
          id: "c2",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-06-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(1);
    expect(eras[0]?.members.map((member) => member.playerId)).toEqual(["p1"]);
    expect(eras[0]?.isCurrent).toBe(true);
  });

  it("does not merge adjacent eras when a player role changes", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-06-01T00:00:00.000Z",
          role: "active",
        }),
        makeContract({
          id: "c2",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-06-01T00:00:00.000Z",
          role: "benched",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(2);
    expect(eras[0]?.members[0]?.role).toBe("benched");
    expect(eras[1]?.members[0]?.role).toBe("active");
  });

  it("skips empty eras across roster gaps", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-02-01T00:00:00.000Z",
        }),
        makeContract({
          id: "c2",
          playerId: "p2",
          playerName: "Bravo",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-05-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(2);
    expect(eras.every((era) => era.members.length > 0)).toBe(true);
  });

  it("marks fully closed history as non-current", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-02-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(1);
    expect(eras[0]?.isCurrent).toBe(false);
    expect(eras[0]?.end).toBe("2026-02-01T00:00:00.000Z");
  });

  it("drops malformed and future contracts", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "not-a-date",
        }),
        makeContract({
          id: "c2",
          playerId: "p2",
          playerName: "Bravo",
          startDate: "2027-01-01T00:00:00.000Z",
        }),
        makeContract({
          id: "c3",
          playerId: "p3",
          playerName: "Charlie",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "invalid",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(1);
    expect(eras[0]?.members.map((member) => member.playerId)).toEqual(["p3"]);
    expect(eras[0]?.isCurrent).toBe(true);
  });

  it("orders members by role then name", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Zulu",
          startDate: "2026-01-01T00:00:00.000Z",
          role: "benched",
        }),
        makeContract({
          id: "c2",
          playerId: "p2",
          playerName: "Alpha",
          startDate: "2026-01-01T00:00:00.000Z",
          role: "active",
        }),
        makeContract({
          id: "c3",
          playerId: "p3",
          playerName: "Mike",
          startDate: "2026-01-01T00:00:00.000Z",
          role: "loaned",
        }),
        makeContract({
          id: "c4",
          playerId: "p4",
          playerName: "Bravo",
          startDate: "2026-01-01T00:00:00.000Z",
          role: "active",
        }),
      ],
      NOW,
    );

    expect(eras[0]?.members.map((member) => member.name)).toEqual([
      "Alpha",
      "Bravo",
      "Zulu",
      "Mike",
    ]);
  });

  it("only uses now for open contracts and current era bounds", () => {
    const earlierNow = new Date("2026-03-15T12:00:00.000Z").getTime();
    const laterNow = new Date("2026-07-20T12:00:00.000Z").getTime();

    const contracts = [
      makeContract({
        id: "c1",
        playerId: "p1",
        playerName: "Alpha",
        startDate: "2026-01-01T00:00:00.000Z",
      }),
    ];

    const earlierEras = buildTeamRosterEras(contracts, earlierNow);
    const laterEras = buildTeamRosterEras(contracts, laterNow);

    expect(earlierEras[0]?.id.endsWith("-now")).toBe(true);
    expect(laterEras[0]?.id.endsWith("-now")).toBe(true);
    expect(earlierEras[0]?.isCurrent).toBe(true);
    expect(laterEras[0]?.isCurrent).toBe(true);
  });

  it("clamps end dates that precede start dates", () => {
    const eras = buildTeamRosterEras(
      [
        makeContract({
          id: "c1",
          playerId: "p1",
          playerName: "Alpha",
          startDate: "2026-05-01T00:00:00.000Z",
          endDate: "2026-01-01T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(eras).toHaveLength(1);
    expect(eras[0]?.end).toBe("2026-05-01T00:00:00.000Z");
    expect(eras[0]?.isCurrent).toBe(false);
  });
});
