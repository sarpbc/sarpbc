import { beforeEach, describe, expect, it, vi } from "vitest";
import { PickemService } from "./pickem.service";
import type { NamedPick, Pick, PickMatch } from "../domain/pickem";
import type { PickemWrites } from "./ports";

describe(PickemService, () => {
  let match: PickMatch;
  let picks: Pick[];
  let service: PickemService;
  const warn = vi.fn<(message: string) => void>();
  beforeEach(() => {
    vi.clearAllMocks();
    match = {
      beginAt: new Date("2030-01-01"),
      endAt: null,
      id: "m",
      participantIds: ["a", "b"],
      pickemsEnabled: true,
      results: [],
      status: null,
      winnerId: null,
    };
    picks = [];

    const scope: PickemWrites = {
      participantExists: async () => true,
      pick: async (user, matchId) =>
        picks.find((p) => p.user.id === user && p.match.id === matchId) ?? null,
      savePick: async (pick) => {
        if (!picks.some((p) => p.id === pick.id)) {
          picks.push(pick);
        }
      },
      unscored: async () => picks.filter((p) => !p.scored),
      userExists: async () => true,
    };

    service = new PickemService(
      {
        list: async () =>
          picks.map((pick): NamedPick => ({
            ...pick,
            user: { ...pick.user, userName: pick.user.id },
          })),
      },
      {
        decide: async (_, id) => {
          match.winnerId = id;
        },
        find: async () => structuredClone(match),
      },
      { run: async (work) => await work(scope) },
      { id: () => "pick-1", now: () => new Date("2026-01-01"), warn },
    );
  });

  it("awards five points once and leaves incorrect picks at zero", async () => {
    await service.makePick("u", "m", "a");
    picks.push({
      ...picks[0],
      id: "pick-2",
      pickedParticipant: { id: "b" },
      user: { id: "v" },
    });
    match.results = [
      { participantId: "a", score: 4 },
      { participantId: "b", score: 2 },
    ];
    await expect(service.validateMatchResult("m")).resolves.toStrictEqual({ updated: 2 });
    expect(picks.map((p) => p.points)).toStrictEqual([5, 0]);
    await expect(service.validateMatchResult("m")).resolves.toStrictEqual({ updated: 0 });
    expect(picks.map((p) => p.points)).toStrictEqual([5, 0]);
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
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "Auto-score skipped for match m: Match has no winner set yet. Wait for the series result and try again.",
    );
  });

  it("does not choose a winner for a tied result", async () => {
    match.results = [
      { participantId: "a", score: 3 },
      { participantId: "b", score: 3 },
    ];
    await expect(service.validateMatchResult("m")).rejects.toThrow("no winner");
  });
});
