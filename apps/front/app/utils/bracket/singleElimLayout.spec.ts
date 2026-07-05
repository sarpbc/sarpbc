import { describe, expect, it } from "vitest";
import { buildBracketSectionLayout } from "./singleElimLayout";
import { makeMatch } from "./testHelpers";

describe("buildBracketSectionLayout", () => {
  it("places first-round matches on the left and the final on the right", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: "semi-a", type: "winner" },
          { match: "final", previousMatch: "semi-b", type: "winner" },
        ],
      }),
    ]);

    expect(layout).not.toBeNull();
    expect(layout?.columnCount).toBe(2);

    const semiA = layout?.matches.find((match) => match.matchId === "semi-a");
    const semiB = layout?.matches.find((match) => match.matchId === "semi-b");
    const final = layout?.matches.find((match) => match.matchId === "final");

    expect(semiA?.column).toBe(0);
    expect(semiB?.column).toBe(0);
    expect(final?.column).toBe(1);
    expect(layout?.connectors).toHaveLength(2);
  });

  it("centers a match between its feeder matches vertically", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: "semi-a", type: "winner" },
          { match: "final", previousMatch: "semi-b", type: "winner" },
        ],
      }),
    ]);

    const semiA = layout?.matches.find((match) => match.matchId === "semi-a");
    const semiB = layout?.matches.find((match) => match.matchId === "semi-b");
    const final = layout?.matches.find((match) => match.matchId === "final");

    expect(final?.row).toBe(((semiA?.row ?? 0) + (semiB?.row ?? 0)) / 2);
  });

  it("places matches in columns by beginAt day while respecting parent order", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-b", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "r2-a",
        beginAt: new Date("2026-01-02"),
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
    ]);

    const r1a = layout?.matches.find((match) => match.matchId === "r1-a");
    const r2a = layout?.matches.find((match) => match.matchId === "r2-a");

    expect(r1a?.column).toBe(0);
    expect(r2a?.column).toBe(1);
  });

  it("separates same-depth matches played on different days into different columns", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-b", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-c", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-d", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "r2-a",
        beginAt: new Date("2026-01-02"),
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-b",
        beginAt: new Date("2026-01-03"),
        previousMatches: [
          { match: "r2-b", previousMatch: "r1-c", type: "winner" },
          { match: "r2-b", previousMatch: "r1-d", type: "winner" },
        ],
      }),
    ]);

    const r2a = layout?.matches.find((match) => match.matchId === "r2-a");
    const r2b = layout?.matches.find((match) => match.matchId === "r2-b");

    expect(r2a?.column).toBe(1);
    expect(r2b?.column).toBe(2);
    expect(r2a?.column).not.toBe(r2b?.column);
  });

  it("keeps matches in the same column from overlapping when ideal rows collide", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a" }),
      makeMatch({ id: "r1-b" }),
      makeMatch({ id: "r1-c" }),
      makeMatch({ id: "r1-d" }),
      makeMatch({
        id: "r2-a",
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-b",
        previousMatches: [
          { match: "r2-b", previousMatch: "r1-c", type: "winner" },
          { match: "r2-b", previousMatch: "r1-d", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-c",
        previousMatches: [
          { match: "r2-c", previousMatch: "r1-a", type: "winner" },
          { match: "r2-c", previousMatch: "r1-c", type: "winner" },
        ],
      }),
    ]);

    const columnOneMatches = layout?.matches.filter((match) => match.column === 1) ?? [];
    const rows = columnOneMatches.map((match) => match.row);

    expect(columnOneMatches).toHaveLength(3);
    expect(new Set(rows).size).toBe(rows.length);
    expect(
      Math.min(...rows.map((row, index) => Math.abs(row - (rows[index + 1] ?? row + 2)))),
    ).toBeGreaterThanOrEqual(2);
  });
});
