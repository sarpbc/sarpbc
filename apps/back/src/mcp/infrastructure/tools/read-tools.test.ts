import { describe, expect, it, vi } from "vitest";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import { Tournament } from "../../../tournament/domain/tournament";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant";
import { TournamentEvent } from "../../../tournament/domain/tournament-event";
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";
import { redistributableCompetition } from "../redistributable-competition";
import { jsonOf } from "../../../../test/mcp-result";
import { readTools } from "./read-tools";
import type { GameStatsStore } from "../../../match-stats/application/ports";
import type { NewsService } from "../../../news/application/news.service";
import type { ContractService } from "../../../roster/application/contract.service";
import type { PlayerService } from "../../../roster/application/player.service";
import type { TeamService } from "../../../roster/application/team.service";
import type { ManualCatalogService } from "../../../tournament/application/manual-catalog.service";
import type { MatchService } from "../../../tournament/application/match/match.service";
import type { MatchLineupService } from "../../../tournament/application/match/match-lineup.service";
import type { PlayerAwardService } from "../../../tournament/application/player-award.service";
import type { EventQueries, TournamentQueries } from "../../../tournament/application/ports";
import type { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";

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

  const matchService = { list: vi.fn<MatchService["list"]>().mockResolvedValue([[], 0]) };

  const matchLineupService = {
    find: vi.fn<MatchLineupService["find"]>(async (matchId) => ({
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
    find: vi.fn<TournamentQueries["find"]>().mockResolvedValue([[], 0]),
    findById: vi.fn<TournamentQueries["findById"]>(async (id) =>
      id === manualCup.id ? manualCup : Object.assign(new Tournament(), { id, source: "startgg" }),
    ),
  };

  const tournamentPrizeService = {
    findByTournamentId: vi
      .fn<TournamentPrizeService["findByTournamentId"]>()
      .mockResolvedValue({ source: "manual", prizepool: null, prizes: [] }),
    teamEarnings: vi
      .fn<TournamentPrizeService["teamEarnings"]>()
      .mockResolvedValue({ totals: [], years: [] }),
    playerEarnings: vi
      .fn<TournamentPrizeService["playerEarnings"]>()
      .mockResolvedValue({ totals: [], years: [] }),
  };

  const playerAwardService = {
    findByTournamentId: vi.fn<PlayerAwardService["findByTournamentId"]>().mockResolvedValue([
      {
        id: "award-1",
        awardType: "mvp",
        player: { id: "p1", name: "Scout", slug: "scout" },
        participant: { id: "part-kc", team: { id: "team-kc", name: "Karmine Corp" } },
      },
    ]),
  };

  const playerService = {
    find: vi.fn<PlayerService["find"]>().mockResolvedValue([player]),
    findBySlug: vi.fn<PlayerService["findBySlug"]>().mockResolvedValue(player),
    findById: vi.fn<PlayerService["findById"]>().mockResolvedValue(null),
  };

  const teamService = {
    find: vi.fn<TeamService["find"]>().mockResolvedValue([team]),
    findBySlug: vi.fn<TeamService["findBySlug"]>().mockResolvedValue(team),
    findById: vi.fn<TeamService["findById"]>().mockResolvedValue(team),
  };

  const playerLines = vi.fn<GameStatsStore["playerLines"]>(async (ids) =>
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
    findEvent: vi.fn<ManualCatalogService["findEvent"]>(async (idOrSlug) => ({
      event: Object.assign(new TournamentEvent(), { id: "event", slug: idOrSlug, name: "Coupe" }),
      stages: [manualCup, Object.assign(new Tournament(), { id: "c1", source: "startgg" })],
    })),
  };

  const tools = readTools({
    playerService,
    teamService,
    contractService: { getContractsByPlayer: vi.fn<ContractService["getContractsByPlayer"]>() },
    newsService: {
      findAll: vi.fn<NewsService["findAll"]>(),
      findOneAdminByIdOrSlug: vi.fn<NewsService["findOneAdminByIdOrSlug"]>(),
    },
    competition: redistributableCompetition({
      matchService,
      matchLineupService,
      tournaments,
      tournamentPrizeService,
      playerAwardService,
      events: { list: vi.fn<EventQueries["list"]>() },
      catalogService,
      tournamentPlayerStatsService: new TournamentPlayerStatsService({ playerLines }),
    }),
  });

  const call = async (name: string, args = {}) => {
    const tool = tools.find((candidate) => candidate.name === name);

    if (!tool) throw new Error(`${name} is not defined`);

    return await tool.run(user, args);
  };

  const json = async (name: string, args = {}) => jsonOf(await call(name, args));

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

    const redistributableOnly: unknown = expect.objectContaining({ redistributableOnly: true });
    expect(matchService.list).toHaveBeenCalledWith("upcoming", redistributableOnly);
    expect(matchService.list).toHaveBeenCalledWith("live", redistributableOnly);
    expect(matchService.list).toHaveBeenCalledWith("results", redistributableOnly);
    expect(tournaments.find).toHaveBeenCalledWith(redistributableOnly);
  });

  it("returns start.gg players and teams with their source", async () => {
    const { json } = setup();
    const anyString: unknown = expect.any(String);

    const startgg: unknown = expect.objectContaining({
      id: anyString,
      source: "startgg",
    });

    await expect(json("search_players", { query: "Scout" })).resolves.toStrictEqual([startgg]);
    await expect(json("search_teams", { query: "Scouted" })).resolves.toStrictEqual([startgg]);
    await expect(json("get_player", { idOrSlug: "scout" })).resolves.toMatchObject({
      source: "startgg",
      role: "active",
      team: { id: "t1", source: "startgg" },
    });
    await expect(json("get_team", { idOrSlug: "scouted" })).resolves.toMatchObject({
      source: "startgg",
    });
  });

  it("returns registered participants and hides start.gg tournaments", async () => {
    const { call, json } = setup();

    await expect(json("get_tournament", { id: "manual-cup" })).resolves.toMatchObject({
      id: "manual-cup",
      participants: [
        {
          id: "part-kc",
          team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" },
        },
      ],
    });
    const callResult = await call("get_tournament", { id: "c1" });
    expect(callResult.isError).toBe(true);
  });

  it("aggregates player stats for a tournament", async () => {
    const { json } = setup();

    await expect(
      json("get_tournament_player_stats", { tournamentId: "manual-cup" }),
    ).resolves.toMatchObject({
      games: 1,
      unlinkedAccounts: 0,
      players: [{ player: { id: "p1" }, games: 1, totals: { goals: 2 }, goalParticipation: 75 }],
    });
  });

  it("aggregates player stats for the stages of an event", async () => {
    const { json, playerLines } = setup();

    await expect(json("get_tournament_player_stats", { event: "coupe" })).resolves.toMatchObject({
      games: 1,
    });
    expect(playerLines).toHaveBeenCalledExactlyOnceWith(["manual-cup"]);
  });

  it("leaves start.gg stages out and requires a selector without reading stats", async () => {
    const { call, playerLines } = setup();

    const startgg = await call("get_tournament_player_stats", { tournamentId: "c1" });
    const missing = await call("get_tournament_player_stats", {});

    expect(startgg.isError).toBe(true);
    expect(missing.isError).toBe(true);
    expect(playerLines).not.toHaveBeenCalled();
  });

  it("returns match lineups with stand-in flags and hides start.gg matches", async () => {
    const { call, json } = setup();
    await expect(json("get_match_lineups", { matchId: "manual-match" })).resolves.toStrictEqual({
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
    const [block] = hidden.content;
    expect(block?.type === "text" ? block.text : "").not.toContain("Scout");
  });

  it("hides start.gg prize distributions", async () => {
    const { call, tournamentPrizeService } = setup();
    tournamentPrizeService.findByTournamentId.mockResolvedValueOnce({
      source: "startgg",
      prizepool: null,
      prizes: [],
    });
    const callResult4 = await call("get_tournament_prizes", { id: "c1" });
    expect(callResult4.isError).toBe(true);
  });

  it("returns redistributable distributions with the PandaScore prize pool", async () => {
    const { json } = setup();
    await expect(json("get_tournament_prizes", { id: "c1" })).resolves.toStrictEqual({
      tournamentId: "c1",
      prizepool: null,
      prizes: [],
    });
  });

  it("hides the awards of start.gg tournaments without reading them", async () => {
    const { call, playerAwardService } = setup();
    const callResult5 = await call("get_tournament_awards", { id: "startgg-cup" });
    expect(callResult5.isError).toBe(true);
    expect(playerAwardService.findByTournamentId).not.toHaveBeenCalled();
  });

  it("returns the awards of a redistributable tournament with their player and team", async () => {
    const { json } = setup();
    await expect(json("get_tournament_awards", { id: "manual-cup" })).resolves.toStrictEqual({
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
