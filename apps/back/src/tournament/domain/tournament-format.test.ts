import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { assertLineupFitsFormat, playerGroupKey } from "./tournament-format";

describe("assertLineupFitsFormat", () => {
  it.each([
    { format: "1v1", teamIds: [], playerGroups: [["zen"], ["vatira"]] },
    { format: "2v2", teamIds: ["kc"], playerGroups: [["zen", "vatira"]] },
    { format: "3v3", teamIds: ["kc", "vitality"], playerGroups: [] },
  ] as const)("accepts a $format lineup", ({ format, teamIds, playerGroups }) => {
    expect(() => assertLineupFitsFormat(format, { teamIds, playerGroups })).not.toThrow();
  });

  it.each([
    { label: "a team in 1v1", format: "1v1", teamIds: ["kc"], playerGroups: [] },
    { label: "a duo in 1v1", format: "1v1", teamIds: [], playerGroups: [["zen", "vatira"]] },
    { label: "a single player in 2v2", format: "2v2", teamIds: [], playerGroups: [["zen"]] },
    {
      label: "a repeated player in 2v2",
      format: "2v2",
      teamIds: [],
      playerGroups: [["zen", "zen"]],
    },
    { label: "players in 3v3", format: "3v3", teamIds: [], playerGroups: [["zen"]] },
    {
      label: "a player in two participants",
      format: "2v2",
      teamIds: [],
      playerGroups: [
        ["zen", "vatira"],
        ["zen", "atow"],
      ],
    },
  ] as const)("rejects $label", ({ format, teamIds, playerGroups }) => {
    expect(() => assertLineupFitsFormat(format, { teamIds, playerGroups })).toThrow(
      InvalidInputError,
    );
  });
});

describe("playerGroupKey", () => {
  it("identifies a duo regardless of player order", () => {
    expect(playerGroupKey(["vatira", "zen"])).toBe(playerGroupKey(["zen", "vatira"]));
  });
});
