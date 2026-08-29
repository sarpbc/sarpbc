import { SearchService } from "./search.service";

describe("SearchService", () => {
  const playerService = { find: jest.fn() };
  const teamService = { find: jest.fn() };
  const tournamentService = { searchByName: jest.fn() };
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(
      playerService as never,
      teamService as never,
      tournamentService as never,
    );
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
