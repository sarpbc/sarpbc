import { describe, expect, it } from "vitest";
import {
  ACTIVE_ROSTER_LIMIT,
  isActiveRosterPlayer,
  isTeamStaffRole,
  selectActiveRosterPlayers,
} from "@sarpbc/utils";

describe("isTeamStaffRole", () => {
  it("treats null/empty as non-staff", () => {
    expect(isTeamStaffRole(null)).toBe(false);
    expect(isTeamStaffRole(undefined)).toBe(false);
    expect(isTeamStaffRole("")).toBe(false);
    expect(isTeamStaffRole("   ")).toBe(false);
  });

  it("detects common staff roles", () => {
    expect(isTeamStaffRole("Coach")).toBe(true);
    expect(isTeamStaffRole("co-coach")).toBe(true);
    expect(isTeamStaffRole("Assistant Coach")).toBe(true);
    expect(isTeamStaffRole("Head Coach")).toBe(true);
    expect(isTeamStaffRole("Manager")).toBe(true);
    expect(isTeamStaffRole("Analyst")).toBe(true);
  });

  it("does not treat unknown roles as staff", () => {
    expect(isTeamStaffRole("Player")).toBe(false);
    expect(isTeamStaffRole("Substitute")).toBe(false);
  });
});

describe("selectActiveRosterPlayers", () => {
  it("excludes coaches and caps at three players", () => {
    const players = [
      { id: "1", name: "A", role: null },
      { id: "2", name: "B", role: null },
      { id: "3", name: "C", role: "Coach" },
      { id: "4", name: "D", role: null },
      { id: "5", name: "E", role: null },
    ];

    const roster = selectActiveRosterPlayers(players);

    expect(roster).toHaveLength(ACTIVE_ROSTER_LIMIT);
    expect(roster.map((p) => p.id)).toEqual(["1", "2", "4"]);
    expect(roster.every(isActiveRosterPlayer)).toBe(true);
  });

  it("returns all non-staff players when under the limit", () => {
    const players = [
      { id: "1", role: null },
      { id: "2", role: "Coach" },
    ];

    expect(selectActiveRosterPlayers(players)).toEqual([{ id: "1", role: null }]);
  });
});
