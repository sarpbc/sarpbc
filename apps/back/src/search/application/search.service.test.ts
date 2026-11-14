import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  const playerService = { find: vi.fn() };
  const teamService = { find: vi.fn() };
  const tournamentService = { searchByName: vi.fn() };
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService(playerService, teamService, tournamentService);
  });

  it("includes tournaments when type is all", async () => {
    playerService.find.mockResolvedValue([{ id: "p1" }]);
    teamService.find.mockResolvedValue([{ id: "tm1" }]);
    tournamentService.searchByName.mockResolvedValue([{ id: "t1", name: "RLCS" }]);

    const result = await service.search({
      query: "rl",
      type: "all",
      limit: 10,
      offset: 0,
    });

    expect(result.tournaments).toEqual([{ id: "t1", name: "RLCS" }]);
    expect(result.total.tournaments).toBe(1);
    expect(tournamentService.searchByName).toHaveBeenCalledWith({
      name: "rl",
      limit: 5,
      offset: 0,
    });
  });

  it("splits an odd page across the kinds of an all search without losing a row", async () => {
    for (const source of [playerService.find, teamService.find, tournamentService.searchByName])
      source.mockResolvedValue([]);

    await service.search({ query: "rl", type: "all", limit: 5, offset: 3 });

    const page = { name: "rl", limit: 3, offset: 1 };
    expect(playerService.find).toHaveBeenCalledWith(page);
    expect(teamService.find).toHaveBeenCalledWith(page);
    expect(tournamentService.searchByName).toHaveBeenCalledWith(page);
  });

  it.each([
    ["player", playerService.find],
    ["team", teamService.find],
  ] as const)("searches only %ss when type is %s", async (type, source) => {
    source.mockResolvedValue([{ id: "x" }]);

    const result = await service.search({ query: "rl", type, limit: 4, offset: 1 });

    expect(source).toHaveBeenCalledWith({ name: "rl", limit: 4, offset: 1 });
    expect(result.total).toEqual({
      players: type === "player" ? 1 : 0,
      teams: type === "team" ? 1 : 0,
      tournaments: 0,
    });
    expect(tournamentService.searchByName).not.toHaveBeenCalled();
  });

  it("searches only tournaments when type is tournament", async () => {
    tournamentService.searchByName.mockResolvedValue([{ id: "t1" }]);

    const result = await service.search({
      query: "major",
      type: "tournament",
      limit: 8,
      offset: 2,
    });

    expect(playerService.find).not.toHaveBeenCalled();
    expect(teamService.find).not.toHaveBeenCalled();
    expect(result.players).toEqual([]);
    expect(result.teams).toEqual([]);
    expect(tournamentService.searchByName).toHaveBeenCalledWith({
      name: "major",
      limit: 8,
      offset: 2,
    });
  });
});
