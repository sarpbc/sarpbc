import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Viewership } from "@sarpbc/types";
import { isForbiddenViewershipSource, parseViewership } from "./viewership";

const VALID: Viewership = {
  peakViewers: 120_000,
  averageViewers: 80_000,
  scope: "official",
  measuredAt: "2026-05-24T18:00:00+02:00",
  sourceName: " Esports Charts ",
  sourceUrl: " https://escharts.com/tournaments/rl/fake-open ",
};

function error(input: Partial<Viewership>) {
  const parsed = parseViewership({ ...VALID, ...input });

  return parsed.ok ? null : parsed.error;
}

void describe("parseViewership", () => {
  void it("normalizes the credit, the source URL and the measured date", () => {
    assert.deepEqual(parseViewership(VALID), {
      ok: true,
      viewership: {
        ...VALID,
        measuredAt: "2026-05-24T16:00:00.000Z",
        sourceName: "Esports Charts",
        sourceUrl: "https://escharts.com/tournaments/rl/fake-open",
      },
    });
    assert.equal(parseViewership({ ...VALID, averageViewers: null, measuredAt: null }).ok, true);
  });

  void it("requires a source name and an https source URL", () => {
    assert.equal(error({ sourceName: "  " }), "missing-source-name");
    assert.equal(error({ sourceName: "x".repeat(81) }), "source-name-too-long");
    assert.equal(error({ sourceUrl: "" }), "invalid-source-url");
    assert.equal(error({ sourceUrl: "http://escharts.com/x" }), "source-url-not-https");
    assert.equal(error({ sourceUrl: "https://liquipedia.net/rocketleague/X" }), "forbidden-source");
    assert.equal(error({ sourceUrl: "https://www.blast.tv/rl" }), "forbidden-source");
  });

  void it("refuses impossible viewer counts", () => {
    assert.equal(error({ peakViewers: -1 }), "invalid-peak");
    assert.equal(error({ peakViewers: 1.5 }), "invalid-peak");
    assert.equal(error({ averageViewers: -3 }), "invalid-average");
    assert.equal(error({ averageViewers: 120_001 }), "average-above-peak");
    assert.equal(error({ measuredAt: "yesterday" }), "invalid-measured-at");
  });
});

void describe("isForbiddenViewershipSource", () => {
  void it("matches the forbidden hosts and their subdomains only", () => {
    assert.equal(isForbiddenViewershipSource("Liquipedia.net"), true);
    assert.equal(isForbiddenViewershipSource("blast.tv"), true);
    assert.equal(isForbiddenViewershipSource("www.start.gg"), true);
    assert.equal(isForbiddenViewershipSource("notblast.tv"), false);
    assert.equal(isForbiddenViewershipSource("escharts.com"), false);
  });
});
