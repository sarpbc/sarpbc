import { describe, expect, it, vi } from "vitest";
import { Player, Team } from "../../../roster/domain/roster";
import { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { redistributableCompetition } from "../redistributable-competition";
import { readTools } from "./read-tools";

const user = { id: "u1", email: "staff@test.com", role: "journalist" } as const;

function setup() {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  const team = Object.assign(new Team(), {
    id: "t1",
    slug: "scouted",
    name: "Scouted",
    source: "startgg",
  });
  const player = Object.assign(new Player(), {
    id: "p1",
    slug: "scout",
    name: "Scout",
    source: "startgg",
    team,
  });
  const matchService = { list: vi.fn().mockResolvedValue([[], 0]) };
  const manualCup = Object.assign(new Tournament(), {
    id: "manual-cup",
    name: "Coupe",
    slug: "coupe",
    source: "manual",
    imageUrl: null,
    event: { id: "event", slug: "coupe", name: "Coupe" },
    beginAt: null,
    endAt: null,
    pickemsEnabled: false,
    league: null,
    description: null,
    tier: null,
    hasBracket: false,
    winner: null,
    matches: [],
    participants: [
      Object.assign(new TournamentParticipant(), {
        id: "part-kc",
        team: Object.assign(new Team(), {
          id: "team-kc",
          slug: "karmine-corp",
          name: "Karmine Corp",
          source: "startgg",
        }),
      }),
    ],
  });
  const tournaments = {
    find: vi.fn().mockResolvedValue([[], 0]),
    findById: vi.fn(async (id: string) =>
      id === manualCup.id ? manualCup : Object.assign(new Tournament(), { id, source: "startgg" }),
    ),
  };
  const tournamentPrizeService = {
    findByTournamentId: vi
      .fn()
      .mockResolvedValue({ source: "manual", prizepool: null, prizes: [] }),
    teamEarnings: vi.fn().mockResolvedValue({ totals: [], years: [] }),
    playerEarnings: vi.fn().mockResolvedValue({ totals: [], years: [] }),
  };
  const playerService = {
    find: vi.fn().mockResolvedValue([player]),
    findBySlug: vi.fn().mockResolvedValue(player),
    findById: vi.fn().mockResolvedValue(null),
  };
  const teamService = {
    find: vi.fn().mockResolvedValue([team]),
    findBySlug: vi.fn().mockResolvedValue(team),
    findById: vi.fn().mockResolvedValue(team),
  };
  const tools = readTools({
    playerService,
    teamService,
    contractService: { getContractsByPlayer: vi.fn() },
    newsService: { findAll: vi.fn(), findOneAdminByIdOrSlug: vi.fn() },
    competition: redistributableCompetition({
      matchService,
      tournaments,
      tournamentPrizeService,
      events: { list: vi.fn() },
      catalogService: { findEvent: vi.fn() },
    }),
  });
  const call = (name: string, args = {}) => {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`${name} is not defined`);
    return tool.run(user, args);
  };
  const json = async (name: string, args = {}) => {
    const block = (await call(name, args)).content[0];
    return JSON.parse(block?.type === "text" ? block.text : "null");
  };
  return {
    matchService,
    tournaments,
    tournamentPrizeService,
    playerService,
    teamService,
    call,
    json,
  };
}

describe("MCP read tools", () => {
  it("excludes start.gg rows in the list queries so totals and pages stay consistent", async () => {
    const { matchService, tournaments, call } = setup();
    await call("get_upcoming_matches");
    await call("get_match_results");
    await call("get_tournaments");

    const redistributableOnly = expect.objectContaining({ redistributableOnly: true });
    expect(matchService.list).toHaveBeenCalledWith("upcoming", redistributableOnly);
    expect(matchService.list).toHaveBeenCalledWith("live", redistributableOnly);
    expect(matchService.list).toHaveBeenCalledWith("results", redistributableOnly);
    expect(tournaments.find).toHaveBeenCalledWith(redistributableOnly);
  });

  it("returns start.gg players and teams with their source", async () => {
    const { json } = setup();
    const startgg = expect.objectContaining({ id: expect.any(String), source: "startgg" });
    expect(await json("search_players", { query: "Scout" })).toEqual([startgg]);
    expect(await json("search_teams", { query: "Scouted" })).toEqual([startgg]);
    expect(await json("get_player", { idOrSlug: "scout" })).toMatchObject({
      source: "startgg",
      role: "active",
      team: { id: "t1", source: "startgg" },
    });
    expect(await json("get_team", { idOrSlug: "scouted" })).toMatchObject({ source: "startgg" });
  });

  it("returns registered participants and hides start.gg tournaments", async () => {
    const { call, json } = setup();
    expect(await json("get_tournament", { id: "manual-cup" })).toMatchObject({
      id: "manual-cup",
      participants: [
        {
          id: "part-kc",
          team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" },
        },
      ],
    });
    expect((await call("get_tournament", { id: "c1" })).isError).toBe(true);
  });

  it("hides start.gg prize distributions", async () => {
    const { call, tournamentPrizeService } = setup();
    tournamentPrizeService.findByTournamentId.mockResolvedValueOnce({
      source: "startgg",
      prizepool: null,
      prizes: [],
    });
    expect((await call("get_tournament_prizes", { id: "c1" })).isError).toBe(true);
  });

  it("returns redistributable distributions with the PandaScore prize pool", async () => {
    const { json } = setup();
    expect(await json("get_tournament_prizes", { id: "c1" })).toEqual({
      tournamentId: "c1",
      prizepool: null,
      prizes: [],
    });
  });

  it("excludes start.gg earnings in the queries", async () => {
    const { call, tournamentPrizeService } = setup();
    await call("get_team_earnings", { idOrSlug: "scouted" });
    await call("get_player_earnings", { idOrSlug: "scout" });
    expect(tournamentPrizeService.teamEarnings).toHaveBeenCalledWith("t1", {
      redistributableOnly: true,
    });
    expect(tournamentPrizeService.playerEarnings).toHaveBeenCalledWith("p1", {
      redistributableOnly: true,
    });
  });

  it("reads a UUID as an id first, then as a slug, and anything else as a slug only", async () => {
    const { call, playerService } = setup();
    const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";

    await call("get_player", { idOrSlug: uuid });
    expect(playerService.findById).toHaveBeenCalledWith(uuid);
    expect(playerService.findBySlug).toHaveBeenCalledWith(uuid);

    playerService.findById.mockClear();
    await call("get_player", { idOrSlug: "scout" });
    expect(playerService.findById).not.toHaveBeenCalled();
  });
});
