import assert from "node:assert/strict";
import { it } from "node:test";
import { describeMeasure, measureFixtures } from "../fixtures/accuracy.ts";

it("reads at least 95% of fixture game scores at one frame every two seconds and never a wrong winner", async (t) => {
  const measure = await measureFixtures(2);
  for (const line of describeMeasure(measure)) t.diagnostic(line);
  assert.ok(measure.rate >= 0.95, `accuracy ${measure.rate}`);
  assert.equal(measure.correctGames + measure.undecidedGames, measure.games);
  assert.ok(measure.results.every((result) => result.series !== "wrong"));
});
