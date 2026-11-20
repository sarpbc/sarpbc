import { describe, expect, it } from "vitest";
import {
  assertPandascoreSyncAllowed,
  assertPandascoreUpsertAllowed,
  assertTournamentUpdateAllowed,
  claimForPandascore,
} from "./tournament-source";

describe("tournament source", () => {
  it("edits manual tournaments freely", () => {
    expect(() => {
      assertTournamentUpdateAllowed("manual", { name: "RLCS Open" });
    }).not.toThrow();
  });

  it("never pulls PandaScore into a manual tournament", () => {
    expect(() => {
      assertPandascoreSyncAllowed("manual");
    }).toThrow("Cannot sync a manual");
    expect(() => {
      assertPandascoreUpsertAllowed({ id: "t1", source: "manual" }, 42);
    }).toThrow("source=manual");
  });

  it("lets staff fix the image and end date of a PandaScore tournament", () => {
    expect(() => {
      assertTournamentUpdateAllowed("pandascore", { endAt: "2025-03-02", imageUrl: null });
    }).not.toThrow();
    expect(() => {
      assertTournamentUpdateAllowed("pandascore", { endAt: "2025-03-02", name: "Renamed" });
    }).toThrow("Only the image and the end date");
  });

  it("claims a manual tournament for PandaScore and keeps its end date as a correction", () => {
    const tournament = {
      endAt: new Date("2025-03-02T00:00Z"),
      endAtCorrected: false,
      id: "t1",
      pandascoreId: null,
      source: "manual" as const,
    };

    claimForPandascore(tournament, 42, null);
    expect(tournament).toMatchObject({
      endAtCorrected: true,
      pandascoreId: 42,
      source: "pandascore",
    });
  });

  it("refuses to claim a synced tournament", () => {
    const base = { endAt: null, endAtCorrected: false, id: "t1", pandascoreId: null };
    expect(() => {
      claimForPandascore({ ...base, source: "pandascore" }, 42, null);
    }).toThrow("source=pandascore");
  });
});
