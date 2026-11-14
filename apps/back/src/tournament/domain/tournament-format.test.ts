import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { assertLineupFitsFormat, playerGroupKey } from "./tournament-format";

describe(assertLineupFitsFormat, () => {
  it.each([
    { format: "1v1", playerGroups: [["zen"], ["vatira"]], teamIds: [] },
    { format: "2v2", playerGroups: [["zen", "vatira"]], teamIds: ["kc"] },
    { format: "3v3", playerGroups: [], teamIds: ["kc", "vitality"] },
  ] as const)("accepts a $format lineup", ({ format, teamIds, playerGroups }) => {
    expect(() => {
      assertLineupFitsFormat(format, { playerGroups, teamIds });
    }).not.toThrow();
  });

  it.each([
    { format: "1v1", label: "a team in 1v1", playerGroups: [], teamIds: ["kc"] },
    { format: "1v1", label: "a duo in 1v1", playerGroups: [["zen", "vatira"]], teamIds: [] },
    { format: "2v2", label: "a single player in 2v2", playerGroups: [["zen"]], teamIds: [] },
    {
      format: "2v2",
      label: "a repeated player in 2v2",
      playerGroups: [["zen", "zen"]],
      teamIds: [],
    },
    { format: "3v3", label: "players in 3v3", playerGroups: [["zen"]], teamIds: [] },
    {
      format: "2v2",
      label: "a player in two participants",
      playerGroups: [
        ["zen", "vatira"],
        ["zen", "atow"],
      ],
      teamIds: [],
    },
  ] as const)("rejects $label", ({ format, teamIds, playerGroups }) => {
    expect(() => {
      assertLineupFitsFormat(format, { playerGroups, teamIds });
    }).toThrow(InvalidInputError);
  });
});

describe(playerGroupKey, () => {
  it("identifies a duo regardless of player order", () => {
    expect(playerGroupKey(["vatira", "zen"])).toBe(playerGroupKey(["zen", "vatira"]));
  });
});
