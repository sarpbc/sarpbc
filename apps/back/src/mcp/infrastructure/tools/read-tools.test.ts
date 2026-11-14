import { describe, expect, it, vi } from "vitest";
import { Player, Team } from "../../../roster/domain/roster";
import { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { TournamentEvent } from "../../../tournament/domain/tournament-event";
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";
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

  const matchLineupService = {
    find: vi.fn(async (matchId: string) => ({
      source: matchId === "startgg-match" ? ("startgg" as const) : ("manual" as const),
      lineups: [
        {
          participantId: "part-kc",
          players: [
            {
              id: "p1",
              name: "Scout",
              slug: "scout",
              imageUrl: null,
              nationality: "FR",
              standIn: true,
            },
          ],
        },
      ],
    })),
  };

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

  const playerAwardService = {
    findByTournamentId: vi.fn().mockResolvedValue([
      {
        id: "award-1",
        awardType: "mvp",
        player: { id: "p1", name: "Scout", slug: "scout" },
        participant: { id: "part-kc", team: { id: "team-kc", name: "Karmine Corp" } },
      },
    ]),
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

  const playerLines = vi.fn(async (ids: string[]) =>
    ids.map((id) => ({
      gameId: `game-${id}`,
      account: "steam:1",
      player: { id: "p1", name: "Scout", slug: "scout" },
      team: { id: "team-kc", name: "Karmine Corp", slug: "karmine-corp" },
      teamGoals: 4,
      goals: 2,
      assists: 1,
      saves: 0,
      shots: 4,
      demolitions: 1,
    })),
  );

  const catalogService = {
    findEvent: vi.fn(async (idOrSlug: string) => ({
      event: Object.assign(new TournamentEvent(), { id: "event", slug: idOrSlug, name: "Coupe" }),
      stages: [manualCup, Object.assign(new Tournament(), { id: "c1", source: "startgg" })],
    })),
  };

  const tools = readTools({
    playerService,
    teamService,
    contractService: { getContractsByPlayer: vi.fn() },
    newsService: { findAll: vi.fn(), findOneAdminByIdOrSlug: vi.fn() },
    competition: redistributableCompetition({
      matchService,
      matchLineupService,
      tournaments,
      tournamentPrizeService,
      playerAwardService,
      events: { list: vi.fn() },
      catalogService,
      tournamentPlayerStatsService: new TournamentPlayerStatsService({ playerLines }),
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
    matchLineupService,
    tournaments,
    tournamentPrizeService,
    playerAwardService,
    playerService,
    teamService,
    playerLines,
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

  it("aggregates player stats per stage or event and leaves start.gg stages out", async () => {
    const { call, json, playerLines } = setup();
    expect(await json("get_tournament_player_stats", { tournamentId: "manual-cup" })).toMatchObject(
      {
        games: 1,
        unlinkedAccounts: 0,
        players: [{ player: { id: "p1" }, games: 1, totals: { goals: 2 }, goalParticipation: 75 }],
      },
    );
    expect(await json("get_tournament_player_stats", { event: "coupe" })).toMatchObject({
      games: 1,
    });
    expect(playerLines).toHaveBeenLastCalledWith(["manual-cup"]);
    expect((await call("get_tournament_player_stats", { tournamentId: "c1" })).isError).toBe(true);
    expect((await call("get_tournament_player_stats", {})).isError).toBe(true);
    expect(playerLines).toHaveBeenCalledTimes(2);
  });

  it("returns match lineups with stand-in flags and hides start.gg matches", async () => {
    const { call, json } = setup();
    expect(await json("get_match_lineups", { matchId: "manual-match" })).toEqual({
      matchId: "manual-match",
      lineups: [
        {
          participantId: "part-kc",
          players: [{ id: "p1", name: "Scout", slug: "scout", standIn: true }],
        },
      ],
    });
    const hidden = await call("get_match_lineups", { matchId: "startgg-match" });
    expect(hidden.isError).toBe(true);
    const block = hidden.content[0];
    expect(block?.type === "text" ? block.text : "").not.toContain("Scout");
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

  it("hides the awards of start.gg tournaments without reading them", async () => {
    const { call, playerAwardService } = setup();
    expect((await call("get_tournament_awards", { id: "startgg-cup" })).isError).toBe(true);
    expect(playerAwardService.findByTournamentId).not.toHaveBeenCalled();
  });

  it("returns the awards of a redistributable tournament with their player and team", async () => {
    const { json } = setup();
    expect(await json("get_tournament_awards", { id: "manual-cup" })).toEqual({
      tournamentId: "manual-cup",
      awards: [
        {
          id: "award-1",
          awardType: "mvp",
          player: { id: "p1", name: "Scout", slug: "scout" },
          team: { id: "team-kc", name: "Karmine Corp" },
        },
      ],
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
