import { describe, expect, it, vi } from "vitest";
import { isUuid } from "../../../common/domain/entity-ref";
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

const user = { email: "staff@test.com", id: "u1", role: "journalist" } as const;

type PrizeDistribution = Awaited<ReturnType<TournamentPrizeService["findByTournamentId"]>>;

interface PrizeState {
  distribution: PrizeDistribution;
}

const playerLines: GameStatsStore["playerLines"] = async (ids) =>
  ids.map((id) => ({
    account: "steam:1",
    assists: 1,
    demolitions: 1,
    gameId: `game-${id}`,
    goals: 2,
    player: { id: "p1", name: "Scout", slug: "scout" },
    saves: 0,
    shots: 4,
    team: { id: "team-kc", name: "Karmine Corp", slug: "karmine-corp" },
    teamGoals: 4,
  }));

const setup = () => {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");

  const team = Object.assign(new Team(), {
    id: "t1",
    name: "Scouted",
    slug: "scouted",
    source: "startgg",
  });

  const player = Object.assign(new Player(), {
    id: "p1",
    name: "Scout",
    slug: "scout",
    source: "startgg",
    team,
  });

  const listed: Parameters<MatchService["list"]>[] = [];

  const matchService = {
    list: async (...args) => {
      listed.push(args);

      return [[], 0];
    },
  } satisfies Pick<MatchService, "list">;

  const matchLineupService = {
    find: async (matchId) => ({
      lineups: [
        {
          participantId: "part-kc",
          players: [
            {
              id: "p1",
              imageUrl: null,
              name: "Scout",
              nationality: "FR",
              slug: "scout",
              standIn: true,
            },
          ],
        },
      ],
      source: matchId === "startgg-match" ? ("startgg" as const) : ("manual" as const),
    }),
  } satisfies Pick<MatchLineupService, "find">;

  const manualCup = Object.assign(new Tournament(), {
    beginAt: null,
    description: null,
    endAt: null,
    event: { id: "event", name: "Coupe", slug: "coupe" },
    hasBracket: false,
    id: "manual-cup",
    imageUrl: null,
    league: null,
    matches: [],
    name: "Coupe",
    participants: [
      Object.assign(new TournamentParticipant(), {
        id: "part-kc",
        team: Object.assign(new Team(), {
          id: "team-kc",
          name: "Karmine Corp",
          slug: "karmine-corp",
          source: "startgg",
        }),
      }),
    ],
    pickemsEnabled: false,
    slug: "coupe",
    source: "manual",
    tier: null,
    winner: null,
  });

  const tournamentQueries: Parameters<TournamentQueries["find"]>[0][] = [];

  const tournaments = {
    find: async (options) => {
      tournamentQueries.push(options);

      return [[], 0];
    },
    findById: async (id) =>
      id === manualCup.id ? manualCup : Object.assign(new Tournament(), { id, source: "startgg" }),
  } satisfies Pick<TournamentQueries, "find" | "findById">;

  const prizes: PrizeState = {
    distribution: { prizepool: null, prizes: [], source: "manual" },
  };

  const earnings: { kind: "player" | "team"; id: string; scope: object }[] = [];

  const tournamentPrizeService = {
    findByTournamentId: async () => prizes.distribution,
    playerEarnings: async (id, scope) => {
      earnings.push({ id, kind: "player", scope });

      return { totals: [], years: [] };
    },
    teamEarnings: async (id, scope) => {
      earnings.push({ id, kind: "team", scope });

      return { totals: [], years: [] };
    },
  } satisfies Pick<
    TournamentPrizeService,
    "findByTournamentId" | "playerEarnings" | "teamEarnings"
  >;

  const playerAwardService = {
    findByTournamentId: async () => [
      {
        awardType: "mvp",
        id: "award-1",
        participant: { id: "part-kc", team: { id: "team-kc", name: "Karmine Corp" } },
        player: { id: "p1", name: "Scout", slug: "scout" },
      },
    ],
  } satisfies Pick<PlayerAwardService, "findByTournamentId">;

  const playerService = {
    find: async () => [player],
    findById: async (id) => {
      if (!isUuid(id)) {
        throw new Error(`invalid input syntax for type uuid: "${id}"`);
      }

      return null;
    },
    findBySlug: async () => player,
  } satisfies Pick<PlayerService, "find" | "findById" | "findBySlug">;

  const teamService = {
    find: async () => [team],
    findById: async () => team,
    findBySlug: async () => team,
  } satisfies Pick<TeamService, "find" | "findById" | "findBySlug">;

  const catalogService = {
    findEvent: async (idOrSlug) => ({
      event: Object.assign(new TournamentEvent(), { id: "event", name: "Coupe", slug: idOrSlug }),
      stages: [manualCup, Object.assign(new Tournament(), { id: "c1", source: "startgg" })],
    }),
  } satisfies Pick<ManualCatalogService, "findEvent">;

  const tools = readTools({
    competition: redistributableCompetition({
      catalogService,
      events: { list: vi.fn<EventQueries["list"]>() },
      matchLineupService,
      matchService,
      playerAwardService,
      tournamentPlayerStatsService: new TournamentPlayerStatsService({
        playerLines,
        redistributablePlayerLines: async () => [],
      }),
      tournamentPrizeService,
      tournaments,
    }),
    contractService: { getContractsByPlayer: vi.fn<ContractService["getContractsByPlayer"]>() },
    newsService: {
      findAll: vi.fn<NewsService["findAll"]>(),
      findOneAdminByIdOrSlug: vi.fn<NewsService["findOneAdminByIdOrSlug"]>(),
    },
    playerService,
    teamService,
  });

  const call = async (name: string, args = {}) => {
    const tool = tools.find((candidate) => candidate.name === name);

    if (!tool) {
      throw new Error(`${name} is not defined`);
    }

    return await tool.run(user, args);
  };

  const json = async (name: string, args = {}) => jsonOf(await call(name, args));

  return {
    call,
    earnings,
    json,
    listed,
    prizes,
    tournamentQueries,
  };
};

describe("MCP read tools", () => {
  it("excludes start.gg rows in the list queries so totals and pages stay consistent", async () => {
    const { listed, tournamentQueries, call } = setup();
    await call("get_upcoming_matches");
    await call("get_match_results");
    await call("get_tournaments");

    const redistributableOnly: unknown = expect.objectContaining({ redistributableOnly: true });
    expect(listed).toContainEqual(["upcoming", redistributableOnly]);
    expect(listed).toContainEqual(["live", redistributableOnly]);
    expect(listed).toContainEqual(["results", redistributableOnly]);
    expect(tournamentQueries).toContainEqual(redistributableOnly);
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
      role: "active",
      source: "startgg",
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
          team: { id: "team-kc", name: "Karmine Corp", slug: "karmine-corp" },
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
      players: [{ games: 1, goalParticipation: 75, player: { id: "p1" }, totals: { goals: 2 } }],
      unlinkedAccounts: 0,
    });
  });

  it("aggregates player stats for the stages of an event", async () => {
    const { json } = setup();

    await expect(json("get_tournament_player_stats", { event: "coupe" })).resolves.toMatchObject({
      games: 1,
    });
  });

  it("leaves start.gg stages out and requires a selector", async () => {
    const { call } = setup();

    const startgg = await call("get_tournament_player_stats", { tournamentId: "c1" });
    const missing = await call("get_tournament_player_stats", {});

    expect(startgg.isError).toBe(true);
    expect(missing.isError).toBe(true);
  });

  it("returns match lineups with stand-in flags and hides start.gg matches", async () => {
    const { call, json } = setup();
    await expect(json("get_match_lineups", { matchId: "manual-match" })).resolves.toStrictEqual({
      lineups: [
        {
          participantId: "part-kc",
          players: [{ id: "p1", name: "Scout", slug: "scout", standIn: true }],
        },
      ],
      matchId: "manual-match",
    });
    const hidden = await call("get_match_lineups", { matchId: "startgg-match" });
    expect(hidden.isError).toBe(true);
    const [block] = hidden.content;
    expect(block?.type === "text" ? block.text : "").not.toContain("Scout");
  });

  it("hides start.gg prize distributions", async () => {
    const { call, prizes } = setup();
    prizes.distribution = { prizepool: null, prizes: [], source: "startgg" };
    const callResult4 = await call("get_tournament_prizes", { id: "c1" });
    expect(callResult4.isError).toBe(true);
  });

  it("returns redistributable distributions with the PandaScore prize pool", async () => {
    const { json } = setup();
    await expect(json("get_tournament_prizes", { id: "c1" })).resolves.toStrictEqual({
      prizepool: null,
      prizes: [],
      tournamentId: "c1",
    });
  });

  it("hides the awards of start.gg tournaments", async () => {
    const { call } = setup();
    const callResult5 = await call("get_tournament_awards", { id: "startgg-cup" });
    expect(callResult5.isError).toBe(true);
  });

  it("returns the awards of a redistributable tournament with their player and team", async () => {
    const { json } = setup();
    await expect(json("get_tournament_awards", { id: "manual-cup" })).resolves.toStrictEqual({
      awards: [
        {
          awardType: "mvp",
          id: "award-1",
          player: { id: "p1", name: "Scout", slug: "scout" },
          team: { id: "team-kc", name: "Karmine Corp" },
        },
      ],
      tournamentId: "manual-cup",
    });
  });

  it("excludes start.gg earnings in the queries", async () => {
    const { call, earnings } = setup();
    await call("get_team_earnings", { idOrSlug: "scouted" });
    await call("get_player_earnings", { idOrSlug: "scout" });
    expect(earnings).toStrictEqual([
      { id: "t1", kind: "team", scope: { redistributableOnly: true } },
      { id: "p1", kind: "player", scope: { redistributableOnly: true } },
    ]);
  });

  it("falls back to the slug for a UUID that is no id and never sends a slug as an id", async () => {
    const { json } = setup();

    await expect(
      json("get_player", { idOrSlug: "0f8fad5b-d9cb-469f-a165-70867728950e" }),
    ).resolves.toMatchObject({ id: "p1" });
    await expect(json("get_player", { idOrSlug: "scout" })).resolves.toMatchObject({ id: "p1" });
  });
});
