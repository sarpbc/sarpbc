import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerService } from "../../roster/application/player.service";
import type { TeamService } from "../../roster/application/team.service";
import type { TournamentQueries } from "../../tournament/application/ports";
import { Player } from "../../roster/domain/player";
import { Team } from "../../roster/domain/team";
import { Tournament } from "../../tournament/domain/tournament";
import { SearchService } from "./search.service";

const player = (id: string) => Object.assign(new Player(), { id });
const team = (id: string) => Object.assign(new Team(), { id });
const tournament = (id: string, name = id) => Object.assign(new Tournament(), { id, name });

describe(SearchService, () => {
  const playerService = { find: vi.fn<PlayerService["find"]>() };
  const teamService = { find: vi.fn<TeamService["find"]>() };
  const tournamentService = { searchByName: vi.fn<TournamentQueries["searchByName"]>() };
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService(playerService, teamService, tournamentService);
  });

  it("includes tournaments when type is all", async () => {
    const rlcs = tournament("t1", "RLCS");
    playerService.find.mockResolvedValue([player("p1")]);
    teamService.find.mockResolvedValue([team("tm1")]);
    tournamentService.searchByName.mockResolvedValue([rlcs]);

    const result = await service.search({
      query: "rl",
      type: "all",
      limit: 10,
      offset: 0,
    });

    expect(result.tournaments).toStrictEqual([rlcs]);
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
    ["player", () => playerService.find.mockResolvedValue([player("x")]), playerService.find],
    ["team", () => teamService.find.mockResolvedValue([team("x")]), teamService.find],
  ] as const)("searches only %ss when type is %s", async (type, seed, source) => {
    seed();

    const result = await service.search({ query: "rl", type, limit: 4, offset: 1 });

    expect(source).toHaveBeenCalledWith({ name: "rl", limit: 4, offset: 1 });
    expect(result.total).toStrictEqual({
      players: type === "player" ? 1 : 0,
      teams: type === "team" ? 1 : 0,
      tournaments: 0,
    });
    expect(tournamentService.searchByName).not.toHaveBeenCalled();
  });

  it("searches only tournaments when type is tournament", async () => {
    tournamentService.searchByName.mockResolvedValue([tournament("t1")]);

    const result = await service.search({
      query: "major",
      type: "tournament",
      limit: 8,
      offset: 2,
    });

    expect(playerService.find).not.toHaveBeenCalled();
    expect(teamService.find).not.toHaveBeenCalled();
    expect(result.players).toStrictEqual([]);
    expect(result.teams).toStrictEqual([]);
    expect(tournamentService.searchByName).toHaveBeenCalledWith({
      name: "major",
      limit: 8,
      offset: 2,
    });
  });
});
