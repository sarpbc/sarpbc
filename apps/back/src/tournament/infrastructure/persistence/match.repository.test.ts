import { describe, expect, it, vi } from "vitest";
import { MatchRepository } from "./match.repository";
import { stageFilter } from "./competition.queries";

describe("MatchRepository", () => {
  function repository() {
    const repo = Object.create(MatchRepository.prototype) as MatchRepository;
    const findAndCount = vi.fn().mockResolvedValue([[], 0]);
    Object.assign(repo, { findAndCount });
    return { repo, findAndCount };
  }

  it("filters start.gg matches, tournaments and teams in the query", async () => {
    const { repo, findAndCount } = repository();
    await repo.findResultsAndCount({ leagueId: "rlcs", redistributableOnly: true });
    expect(findAndCount).toHaveBeenCalledWith(
      {
        endAt: { $ne: null },
        source: { $ne: "startgg" },
        tournament: { league: { id: "rlcs" }, source: { $ne: "startgg" } },
        participants: { $none: { team: { source: "startgg" } } },
      },
      expect.anything(),
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
