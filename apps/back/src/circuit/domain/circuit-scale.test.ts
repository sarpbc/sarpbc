import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { assertCircuitSourceUrl, parseCircuitScale, pointsForPlacement } from "./circuit-scale";

describe(parseCircuitScale, () => {
  it("orders tiers by placement", () => {
    expect(
      parseCircuitScale([
        { from: 3, points: 2, to: 4 },
        { from: 1, points: 5, to: 2 },
      ]),
    ).toStrictEqual([
      { from: 1, points: 5, to: 2 },
      { from: 3, points: 2, to: 4 },
    ]);
  });

  it.each([
    [[{ from: 0, points: 1, to: 1 }], "Placements"],
    [[{ from: 4, points: 1, to: 3 }], "Placements"],
    [[{ from: 1, points: 1.5, to: 1 }], "Points"],
    [[{ from: 1, points: -1, to: 1 }], "Points"],
    [
      [
        { from: 1, points: 5, to: 4 },
        { from: 3, points: 2, to: 6 },
      ],
      "two tiers",
    ],
  ])("refuses %j", (tiers, message) => {
    expect(() => parseCircuitScale(tiers)).toThrow(message);
  });
});

describe(pointsForPlacement, () => {
  const scale = [{ from: 5, points: 4, to: 8 }];

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
