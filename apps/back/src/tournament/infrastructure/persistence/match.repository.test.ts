import { describe, expect, it, vi } from "vitest";
import { MatchRepository } from "./match.repository";
import { stageFilter } from "./competition.queries";

describe("MatchRepository", () => {
  function repository() {
    const repo = Object.create(MatchRepository.prototype) as MatchRepository;
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    const find = vi.fn().mockResolvedValue([]);
    Object.assign(repo, { findAndCount, find });
    return { repo, findAndCount, find };
  }

  it("filters start.gg matches and tournaments but not start.gg participants", async () => {
    const { repo, findAndCount } = repository();
    await repo.findResultsAndCount({ leagueId: "rlcs", redistributableOnly: true });
    expect(findAndCount).toHaveBeenCalledWith(
      {
        endAt: { $ne: null },
        source: { $ne: "startgg" },
        tournament: { league: { id: "rlcs" }, source: { $ne: "startgg" } },
      },
      expect.anything(),
    );
  });

  it("scopes results to a team's participations", async () => {
    const { repo, find } = repository();
    await repo.findResults({ teamId: "falcons", limit: 5 });
    expect(find).toHaveBeenCalledWith(
      { endAt: { $ne: null }, participants: { team: { id: "falcons" } } },
      expect.objectContaining({ limit: 5, orderBy: { endAt: "DESC" } }),
    );
  });

  it("only treats recently started matches as live when given a window", async () => {
    const { repo, find } = repository();
    const liveSince = new Date("2026-10-31T12:00:00Z");
    await repo.findLive({ teamId: "falcons", liveSince, limit: 5 });
    expect(find).toHaveBeenCalledWith(
      {
        beginAt: { $lte: expect.any(Date), $gte: liveSince },
        endAt: null,
        participants: { team: { id: "falcons" } },
      },
      expect.objectContaining({ limit: 5 }),
    );
  });

  it("keeps start.gg rows for public lists", async () => {
    const { repo, findAndCount } = repository();
    await repo.findResultsAndCount({});
    expect(findAndCount).toHaveBeenCalledWith({ endAt: { $ne: null } }, expect.anything());
  });
});

describe("stageFilter", () => {
  it("excludes start.gg tournaments when only redistributable data is requested", () => {
    expect(stageFilter({ redistributableOnly: true })).toEqual({ source: { $ne: "startgg" } });
    expect(stageFilter({})).toEqual({});
  });
});
