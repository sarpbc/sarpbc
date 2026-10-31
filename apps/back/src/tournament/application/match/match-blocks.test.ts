import { beforeEach, describe, expect, it, vi } from "vitest";
import { Match } from "../../domain/competition";
import type { MatchQueries } from "../ports";
import { findMatchBlocks, isMatchBlockLive, MATCH_BLOCK_LIVE_WINDOW_MS } from "./match-blocks";

const NOW = new Date("2026-10-31T18:00:00Z");

describe("findMatchBlocks", () => {
  const reads = {
    byIds: vi.fn<MatchQueries["byIds"]>(),
    page: vi.fn<MatchQueries["page"]>(),
  };
  const stored = (id: string) => Object.assign(new Match(), { id });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads every picked match in one query and keeps each block's order", async () => {
    reads.byIds.mockResolvedValue([stored("b"), stored("a")]);

    const [single, manual] = await findMatchBlocks(
      reads,
      [
        { kind: "match", id: "a" },
        { kind: "matches", ids: ["b", "missing", "a"] },
      ],
      NOW,
    );

    expect(reads.byIds).toHaveBeenCalledTimes(1);
    expect(reads.byIds).toHaveBeenCalledWith(["a", "b", "missing"]);
    expect(reads.page).not.toHaveBeenCalled();
    expect(single?.map((match) => match.id)).toEqual(["a"]);
    expect(manual?.map((match) => match.id)).toEqual(["b", "a"]);
  });

  it("puts live, then upcoming, then recent results of a scope up to its limit", async () => {
    reads.page.mockImplementation(async (kind) =>
      kind === "live"
        ? [stored("live")]
        : kind === "upcoming"
          ? [stored("next"), stored("later")]
          : [stored("result")],
    );

    const [tournament, team] = await findMatchBlocks(
      reads,
      [
        { kind: "tournament", id: "cup", limit: 3 },
        { kind: "team", id: "falcons", limit: 10 },
      ],
      NOW,
    );

    expect(reads.byIds).not.toHaveBeenCalled();
    expect(reads.page).toHaveBeenCalledWith("live", {
      limit: 3,
      tournamentId: "cup",
      liveSince: new Date(NOW.getTime() - MATCH_BLOCK_LIVE_WINDOW_MS),
    });
    expect(reads.page).toHaveBeenCalledWith("results", { limit: 10, teamId: "falcons" });
    expect(tournament?.map((match) => match.id)).toEqual(["live", "next", "later"]);
    expect(team?.map((match) => match.id)).toEqual(["live", "next", "later", "result"]);
  });

  it("queries a tournament or team once for blocks with different limits", async () => {
    reads.page.mockImplementation(async (kind) =>
      kind === "upcoming" ? ["a", "b", "c", "d"].map(stored) : [],
    );

    const [short, long] = await findMatchBlocks(
      reads,
      [
        { kind: "team", id: "falcons", limit: 2 },
        { kind: "team", id: "falcons", limit: 4 },
      ],
      NOW,
    );

    expect(reads.page).toHaveBeenCalledTimes(3);
    expect(reads.page).toHaveBeenCalledWith("upcoming", { limit: 4, teamId: "falcons" });
    expect(short?.map((match) => match.id)).toEqual(["a", "b"]);
    expect(long?.map((match) => match.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("isMatchBlockLive", () => {
  const started = (hoursAgo: number, endAt: Date | null = null) =>
    Object.assign(new Match(), {
      beginAt: new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000),
      endAt,
    });

  it("stops treating a match without an end as live after the window", () => {
    expect(isMatchBlockLive(started(1), NOW)).toBe(true);
    expect(isMatchBlockLive(started(5), NOW)).toBe(true);
    expect(isMatchBlockLive(started(7), NOW)).toBe(false);
    expect(isMatchBlockLive(started(-1), NOW)).toBe(false);
    expect(isMatchBlockLive(started(1, NOW), NOW)).toBe(false);
  });
});
