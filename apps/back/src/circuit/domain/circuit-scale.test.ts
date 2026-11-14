import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { assertCircuitSourceUrl, parseCircuitScale, pointsForPlacement } from "./circuit-scale";

describe(parseCircuitScale, () => {
  it("orders tiers by placement", () => {
    expect(
      parseCircuitScale([
        { from: 3, to: 4, points: 2 },
        { from: 1, to: 2, points: 5 },
      ]),
    ).toStrictEqual([
      { from: 1, to: 2, points: 5 },
      { from: 3, to: 4, points: 2 },
    ]);
  });

  it.each([
    [[{ from: 0, to: 1, points: 1 }], "Placements"],
    [[{ from: 4, to: 3, points: 1 }], "Placements"],
    [[{ from: 1, to: 1, points: 1.5 }], "Points"],
    [[{ from: 1, to: 1, points: -1 }], "Points"],
    [
      [
        { from: 1, to: 4, points: 5 },
        { from: 3, to: 6, points: 2 },
      ],
      "two tiers",
    ],
  ])("refuses %j", (tiers, message) => {
    expect(() => parseCircuitScale(tiers)).toThrow(message);
  });
});

describe(pointsForPlacement, () => {
  const scale = [{ from: 5, to: 8, points: 4 }];

  it("returns the points of the range holding the placement, or null outside it", () => {
    expect(pointsForPlacement(scale, 5)).toBe(4);
    expect(pointsForPlacement(scale, 8)).toBe(4);
    expect(pointsForPlacement(scale, 9)).toBeNull();
    expect(pointsForPlacement([], 1)).toBeNull();
  });
});

describe(assertCircuitSourceUrl, () => {
  it("accepts an http(s) source and refuses other values and Liquipedia", () => {
    expect(() => {
      assertCircuitSourceUrl("https://example.org/rules");
    }).not.toThrow();
    expect(() => {
      assertCircuitSourceUrl("");
    }).toThrow(InvalidInputError);
    expect(() => {
      assertCircuitSourceUrl("ftp://example.org/rules");
    }).toThrow(InvalidInputError);
    expect(() => {
      assertCircuitSourceUrl("https://liquipedia.net/rocketleague/x");
    }).toThrow("Liquipedia");
  });
});
