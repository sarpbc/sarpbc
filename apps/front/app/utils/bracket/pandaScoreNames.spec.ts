import { describe, expect, it } from "vitest";
import {
  getBracketSectionFromName,
  getCombinedColumnFromName,
  getUpperColumnFromName,
  parseBracketRoundFromName,
} from "./pandaScoreNames";

describe("parseBracketRoundFromName", () => {
  it("parses upper bracket rounds with columns", () => {
    expect(parseBracketRoundFromName("Upper bracket quarterfinal 1: M8 vs VIT")).toEqual({
      section: "upper",
      column: 2,
    });
    expect(parseBracketRoundFromName("Upper bracket semifinal 1")).toEqual({
      section: "upper",
      column: 3,
    });
    expect(parseBracketRoundFromName("Upper bracket final")).toEqual({
      section: "upper",
      column: 4,
    });
  });

  it("parses lower bracket rounds with columns", () => {
    expect(parseBracketRoundFromName("Lower bracket round 1 match 2: KC vs GHT")).toEqual({
      section: "lower",
      column: 0,
    });
    expect(parseBracketRoundFromName("Lower bracket round 2 match 1")).toEqual({
      section: "lower",
      column: 1,
    });
    expect(parseBracketRoundFromName("Lower bracket quarterfinal 1")).toEqual({
      section: "lower",
      column: 2,
    });
  });

  it("parses cross-bracket finals", () => {
    expect(parseBracketRoundFromName("Semifinal 1")).toEqual({
      section: "finals",
      column: 3,
    });
    expect(parseBracketRoundFromName("Grand final: M8 vs VIT")).toEqual({
      section: "finals",
      column: 4,
    });
  });

  it("returns null for unrecognized names", () => {
    expect(parseBracketRoundFromName("Karmine Corp vs Vitality")).toBeNull();
    expect(parseBracketRoundFromName(undefined)).toBeNull();
  });
});

describe("name parser helpers", () => {
  it("exposes section and column accessors", () => {
    expect(getBracketSectionFromName("Lower bracket round 1 match 1")).toBe("lower");
    expect(getCombinedColumnFromName("Semifinal 2")).toBe(3);
    expect(getUpperColumnFromName("Upper bracket quarterfinal 2")).toBe(2);
    expect(getUpperColumnFromName("Semifinal 1")).toBeNull();
  });
});
