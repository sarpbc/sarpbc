import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distinctStageName, tournamentStageLabel } from "./tournament-label";

describe("tournamentStageLabel", () => {
  it("appends the stage name to the event name", () => {
    assert.equal(
      tournamentStageLabel({ name: "Playoffs", event: { name: "RLCS Paris" } }),
      "RLCS Paris Playoffs",
    );
  });

  it("drops a stage already named by the event, ignoring case", () => {
    const stage = { name: "Open 1", event: { name: "Epic Games Open 1" } };
    assert.equal(distinctStageName(stage), null);
    assert.equal(tournamentStageLabel(stage), "Epic Games Open 1");
  });

  it("falls back to the event name for a blank stage", () => {
    assert.equal(tournamentStageLabel({ name: "  ", event: { name: " RLCS " } }), "RLCS");
  });
});
