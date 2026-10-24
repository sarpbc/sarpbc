import { describe, expect, it } from "vitest";
import {
  assertPandascoreSyncAllowed,
  assertPandascoreUpsertAllowed,
  assertTournamentUpdateAllowed,
} from "./tournament-source";

describe("tournament source", () => {
  it("edits start.gg tournaments like manual ones", () => {
    expect(() => assertTournamentUpdateAllowed("startgg", { name: "RLCS Open" })).not.toThrow();
  });

  it("never pulls PandaScore into a start.gg tournament", () => {
    expect(() => assertPandascoreSyncAllowed("startgg")).toThrow("Cannot sync a startgg");
    expect(() => assertPandascoreUpsertAllowed({ id: "t1", source: "startgg" }, 42)).toThrow(
      "source=startgg",
    );
  });
});
