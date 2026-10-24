import { describe, expect, it, vi } from "vitest";
import { registerReadTools } from "./read-tools";

function setup() {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  const team = { id: "t1", slug: "scouted", name: "Scouted", source: "startgg", players: [] };
  const player = { id: "p1", slug: "scout", name: "Scout", source: "startgg", team };
  const matchService = {
    findUpcomingAndCount: vi.fn().mockResolvedValue([[], 0]),
    findLiveAndCount: vi.fn().mockResolvedValue([[], 0]),
    findResultsAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  const tournamentService = {
    find: vi.fn().mockResolvedValue([[], 0]),
    findById: vi.fn().mockResolvedValue({ id: "c1", source: "startgg" }),
  };
  const searchService = {
    searchPlayers: vi.fn().mockResolvedValue([player]),
    searchTeams: vi.fn().mockResolvedValue([team]),
  };
  const playerService = { findBySlug: vi.fn().mockResolvedValue(player) };
  const teamService = {
    findBySlug: vi.fn().mockResolvedValue(team),
    getTeamWithPlayers: vi.fn().mockResolvedValue(team),
  };
  const registerTool = vi.fn();
  registerReadTools(
    { registerTool } as never,
    { matchService, tournamentService, searchService, playerService, teamService } as never,
  );
  const call = (name: string, args = {}) =>
    registerTool.mock.calls.find((tool) => tool[0] === name)?.[2](args);
  const json = async (name: string, args = {}) =>
    JSON.parse((await call(name, args)).content[0].text);
  return { matchService, tournamentService, call, json };
}

describe("MCP read tools", () => {
  it("excludes start.gg rows in the list queries so totals and pages stay consistent", async () => {
    const { matchService, tournamentService, call } = setup();
    await call("get_upcoming_matches");
    await call("get_match_results");
    await call("get_tournaments");

    const redistributableOnly = expect.objectContaining({ redistributableOnly: true });
    expect(matchService.findUpcomingAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(matchService.findLiveAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(matchService.findResultsAndCount).toHaveBeenCalledWith(redistributableOnly);
    expect(tournamentService.find).toHaveBeenCalledWith(redistributableOnly);
  });

  it("returns start.gg players and teams with their source", async () => {
    const { json } = setup();
    const startgg = expect.objectContaining({ id: expect.any(String), source: "startgg" });
    expect(await json("search_players", { query: "Scout" })).toEqual([startgg]);
    expect(await json("search_teams", { query: "Scouted" })).toEqual([startgg]);
    expect(await json("get_player", { idOrSlug: "scout" })).toMatchObject({
      source: "startgg",
      team: { id: "t1", source: "startgg" },
    });
    expect(await json("get_team", { idOrSlug: "scouted" })).toMatchObject({ source: "startgg" });
  });

  it("hides start.gg tournaments", async () => {
    const { call } = setup();
    expect((await call("get_tournament", { id: "c1" })).isError).toBe(true);
  });
});
