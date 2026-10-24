import { describe, expect, it } from "vitest";
import { inferEndAt } from "./tournament-end";

const at = (iso: string) => new Date(iso);

describe("inferEndAt", () => {
  it("returns the latest played match end once every match is settled", () => {
    expect(
      inferEndAt([
        { status: "finished", beginAt: at("2025-03-01T10:00Z"), endAt: at("2025-03-01T11:00Z") },
        { status: "finished", beginAt: at("2025-03-02T10:00Z"), endAt: null },
        { status: "canceled", beginAt: at("2025-03-03T10:00Z"), endAt: null },
      ]),
    ).toEqual(at("2025-03-02T10:00Z"));
  });

  it("returns null while a match is still to play", () => {
    expect(
      inferEndAt([
        { status: "finished", beginAt: at("2025-03-01T10:00Z"), endAt: at("2025-03-01T11:00Z") },
        { status: "not_started", beginAt: at("2025-03-02T10:00Z"), endAt: null },
      ]),
    ).toBeNull();
  });

  it("returns null without any played match", () => {
    expect(inferEndAt([])).toBeNull();
    expect(
      inferEndAt([{ status: "canceled", beginAt: at("2025-03-01T10:00Z"), endAt: null }]),
    ).toBeNull();
  });
});
