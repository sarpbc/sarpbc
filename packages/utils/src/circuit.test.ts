import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isForbiddenCircuitSourceHost, isWorldwideCircuitRegion } from "./circuit";

describe("isWorldwideCircuitRegion", () => {
  it("treats no region and Worldwide as worldwide", () => {
    for (const region of [null, undefined, "", "  ", "Worldwide", " worldwide "])
      assert.equal(isWorldwideCircuitRegion(region), true);
  });

  it("treats a named region as regional", () => {
    for (const region of ["EU", "NA", "MENA", "SAM", "OCE", "APAC", "SSA"])
      assert.equal(isWorldwideCircuitRegion(region), false);
  });
});

describe("isForbiddenCircuitSourceHost", () => {
  it("refuses Liquipedia and BLAST.tv hosts", () => {
    for (const host of ["liquipedia.net", "liquipedia-mirror.example", "blast.tv", "www.BLAST.tv"])
      assert.equal(isForbiddenCircuitSourceHost(host), true);
  });

  it("accepts official sources", () => {
    for (const host of ["rocketleague.com", "notblast.tv", "start.gg"])
      assert.equal(isForbiddenCircuitSourceHost(host), false);
  });
});
