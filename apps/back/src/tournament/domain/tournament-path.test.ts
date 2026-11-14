import { describe, expect, it } from "vitest";
import { parseTournamentPath } from "./tournament-path";

const ID = "0B6F2D3E-6C1A-4B8E-9A51-2F7C3D4E5A6B";
const id = ID.toLowerCase();

describe(parseTournamentPath, () => {
  it("reads a UUID as a legacy stage, with an optional matches tab", () => {
    expect(parseTournamentPath([ID])).toStrictEqual({ id, kind: "legacyStage", tab: "overview" });
    expect(parseTournamentPath([id, "matches"])).toStrictEqual({
      id,
      kind: "legacyStage",
      tab: "matches",
    });
    expect(parseTournamentPath([id, "MATCHES"])).toStrictEqual({
      id,
      kind: "legacyStage",
      tab: "matches",
    });
  });

  it("rejects any other legacy suffix", () => {
    expect(parseTournamentPath([id, "overview"])).toBeNull();
  });

  it("reads lowercased event and stage slugs", () => {
    expect(parseTournamentPath(["RLCS-Major-Paris-2026"])).toStrictEqual({
      eventSlug: "rlcs-major-paris-2026",
      kind: "event",
    });
    expect(parseTournamentPath(["rlcs-major-paris-2026", "Playoffs"])).toStrictEqual({
      eventSlug: "rlcs-major-paris-2026",
      kind: "stage",
      stageSlug: "playoffs",
    });
  });

  it("treats a stage slugged matches as a stage", () => {
    expect(parseTournamentPath(["cup", "matches"])).toStrictEqual({
      eventSlug: "cup",
      kind: "stage",
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
