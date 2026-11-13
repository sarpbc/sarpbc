import assert from "node:assert/strict";
import { it } from "node:test";
import { describeMeasure, measureFixtures } from "../fixtures/accuracy.ts";

it("reads every fixture series and at least 95% of game scores at one frame per second", async (t) => {
  const measure = await measureFixtures(1);
  for (const line of describeMeasure(measure)) t.diagnostic(line);
  assert.ok(measure.rate >= 0.95, `accuracy ${measure.rate}`);
  assert.ok(measure.results.every((result) => result.series === "correct"));
});
