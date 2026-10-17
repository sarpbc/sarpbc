import { beforeEach, describe, expect, it, vi } from "vitest";
import { PickemService } from "./pickem.service";
import type { Pick, PickMatch } from "../domain/pickem";
import type { PickemWrites } from "./ports";
describe("PickemService", () => {
  let match: PickMatch, picks: Pick[], service: PickemService;
  const warn = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    match = {
      id: "m",
      pickemsEnabled: true,
      beginAt: new Date("2030-01-01"),
      endAt: null,
      status: null,
      participantIds: ["a", "b"],
      winnerId: null,
      results: [],
    };
    picks = [];
    const scope: PickemWrites = {
      userExists: async () => true,
      participantExists: async () => true,
      match: async () => structuredClone(match),
      pick: async (user, match) =>
        picks.find((p) => p.user.id === user && p.match.id === match) ?? null,
      unscored: async () => picks.filter((p) => !p.scored),
      savePick: async (pick) => {
        if (!picks.some((p) => p.id === pick.id)) picks.push(pick);
      },
      setWinner: async (_, id) => {
        match.winnerId = id;
      },
    };
    service = new PickemService(
      { list: async () => picks },
      { run: async (work) => work(scope) },
      { now: () => new Date("2026-01-01"), id: () => "pick-1", warn },
    );
  });
  it("awards five points once and leaves incorrect picks at zero", async () => {
    await service.makePick("u", "m", "a");
    picks.push({
      ...picks[0],
      id: "pick-2",
      user: { id: "v", userName: "V" },
      pickedParticipant: { id: "b" },
    });
    match.results = [
      { participantId: "a", score: 4 },
      { participantId: "b", score: 2 },
    ];
    expect(await service.validateMatchResult("m")).toEqual({ updated: 2 });
    expect(picks.map((p) => p.points)).toEqual([5, 0]);
    expect(await service.validateMatchResult("m")).toEqual({ updated: 0 });
    expect(picks.map((p) => p.points)).toEqual([5, 0]);
  });
  it("rechecks current match eligibility for every edit", async () => {
    await service.makePick("u", "m", "a");
    match.beginAt = new Date("2025-01-01");
    await expect(service.makePick("u", "m", "b")).rejects.toThrow("already started");
    expect(picks[0].pickedParticipant.id).toBe("a");
  });
  it("does not accept participants outside the match", async () => {
    await expect(service.makePick("u", "m", "other")).rejects.toThrow("not part");
    expect(picks).toHaveLength(0);
  });
  it("keeps automatic scoring best effort when no winner can be derived", async () => {
    await expect(service.autoScoreMatch("m")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
  it("does not choose a winner for a tied result", async () => {
    match.results = [
      { participantId: "a", score: 3 },
      { participantId: "b", score: 3 },
    ];
    await expect(service.validateMatchResult("m")).rejects.toThrow("no winner");
  });
});
