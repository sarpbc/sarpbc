import { describe, expect, it } from "vitest";
import { parseTournamentPath } from "./tournament-path";

const ID = "0B6F2D3E-6C1A-4B8E-9A51-2F7C3D4E5A6B";
const id = ID.toLowerCase();

describe("parseTournamentPath", () => {
  it("reads a UUID as a legacy stage, with an optional matches tab", () => {
    expect(parseTournamentPath([ID])).toEqual({ kind: "legacyStage", id, tab: "overview" });
    expect(parseTournamentPath([id, "matches"])).toEqual({
      kind: "legacyStage",
      id,
      tab: "matches",
    });
    expect(parseTournamentPath([id, "MATCHES"])).toEqual({
      kind: "legacyStage",
      id,
      tab: "matches",
    });
  });

  it("rejects any other legacy suffix", () => {
    expect(parseTournamentPath([id, "overview"])).toBeNull();
  });

  it("reads lowercased event and stage slugs", () => {
    expect(parseTournamentPath(["RLCS-Major-Paris-2026"])).toEqual({
      kind: "event",
      eventSlug: "rlcs-major-paris-2026",
    });
    expect(parseTournamentPath(["rlcs-major-paris-2026", "Playoffs"])).toEqual({
      kind: "stage",
      eventSlug: "rlcs-major-paris-2026",
      stageSlug: "playoffs",
    });
  });

  it("treats a stage slugged matches as a stage", () => {
    expect(parseTournamentPath(["cup", "matches"])).toEqual({
      kind: "stage",
      eventSlug: "cup",
      stageSlug: "matches",
    });
  });

  it("rejects empty and overlong paths", () => {
    expect(parseTournamentPath([])).toBeNull();
    expect(parseTournamentPath([""])).toBeNull();
    expect(parseTournamentPath(["cup", ""])).toBeNull();
    expect(parseTournamentPath(["cup", "playoffs", "matches"])).toBeNull();
  });
});
