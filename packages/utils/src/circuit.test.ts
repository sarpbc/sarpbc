import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWorldwideCircuitRegion } from "./circuit";

void describe("isWorldwideCircuitRegion", () => {
  void it("treats no region and Worldwide as worldwide", () => {
    for (const region of [null, undefined, "", "  ", "Worldwide", " worldwide "])
      assert.equal(isWorldwideCircuitRegion(region), true);
  });

  void it("treats a named region as regional", () => {
    for (const region of ["EU", "NA", "MENA", "SAM", "OCE", "APAC", "SSA"])
      assert.equal(isWorldwideCircuitRegion(region), false);
  });
});
