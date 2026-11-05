import { describe, expect, it, vi } from "vitest";
import type { StatsImportItem, StatsPlayerAccounts, TournamentStatsGame } from "@sarpbc/types";
import { ConflictError } from "../../../common/domain/errors";
import type { StatsImport } from "../../../match-stats/domain/stats-import";
import { registerGameStatsTools, summarizeStatsImport } from "./game-stats-tools";

const TOOLS = [
  "import_game_stats",
  "get_game_stats_import",
  "list_unlinked_game_players",
  "link_game_player",
  "attach_replay_to_game",
  "remove_match_game",
];

function item(replayId: string, overrides: Partial<StatsImportItem> = {}): StatsImportItem {
  return {
    replayId,
    title: replayId,
    playedAt: null,
    status: "unmatched",
    matchId: null,
    reason: "unknown_teams",
    ...overrides,
  } as StatsImportItem;
}

const statsImport: StatsImport = {
  id: "import-1",
  tournamentId: "t1",
  groupId: "rlcs-x1",
  status: "completed",
  total: 6,
  processed: 6,
  items: [
    item("imported", { status: "imported", matchId: "m1", gameNumber: 1 }),
    item("stored", { status: "already_imported", matchId: "m1", gameNumber: 2 }),
    item("other-1"),
    item("other-2", { reason: "outside_match_window" }),
    item("incomplete", { matchId: "m2", reason: "incomplete_series" }),
    item("failed", { status: "failed", matchId: "m1", gameNumber: 3, reason: "fetch_failed" }),
  ],
  error: null,
  createdAt: new Date("2026-06-02T10:00:00Z"),
  startedAt: new Date("2026-06-02T10:00:01Z"),
  finishedAt: new Date("2026-06-02T10:05:00Z"),
};

const accounts: StatsPlayerAccounts = {
  players: [
    {
      platform: "steam",
      platformId: "1",
      name: "Racer",
      team: { participantId: "p1", name: "Vitality" },
      games: 4,
      player: null,
    },
    {
      platform: "steam",
      platformId: "2",
      name: "zen",
      team: { participantId: "p1", name: "Vitality" },
      games: 4,
      player: { id: "zen", name: "zen" },
    },
  ],
  rosters: [{ participantId: "p1", teamName: "Vitality", players: [{ id: "zen", name: "zen" }] }],
};

const game: TournamentStatsGame = {
  matchId: "m1",
  number: 2,
  ballchasingId: "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  playedAt: null,
  blueParticipantId: "p1",
  orangeParticipantId: "p2",
  blueGoals: 3,
  orangeGoals: 1,
};

function setup(role: "admin" | "journalist") {
  const statsImportService = {
    request: vi.fn(async () => ({ ...statsImport, status: "pending", items: [] })),
    recent: vi.fn(async () => [statsImport]),
  };
  const statsPlayerLinkService = {
    accounts: vi.fn(async () => accounts),
    link: vi.fn(async () => 7),
  };
  const manualGameService = {
    attach: vi.fn(async () => game),
    remove: vi.fn(async () => game),
  };
  const registerTool = vi.fn();
  registerGameStatsTools(
    { registerTool } as never,
    {
      user: { id: "u1", email: "staff@test.com", role },
      statsImportService,
      statsPlayerLinkService,
      manualGameService,
    } as never,
  );
  const call = async (name: string, input: Record<string, string | number | boolean>) => {
    const tool = registerTool.mock.calls.find((registered) => registered[0] === name);
    if (!tool) throw new Error(`${name} is not registered`);
    const result = await tool[2](input);
    return { result, body: result.isError ? null : JSON.parse(result.content[0].text) };
  };
  return { registerTool, call, statsImportService, statsPlayerLinkService, manualGameService };
}

describe("summarizeStatsImport", () => {
  it("counts other-stage replays and lists only the ones staff should review", () => {
    const summary = summarizeStatsImport(statsImport, false);

    expect(summary.counts).toEqual({ imported: 1, already_imported: 1, unmatched: 3, failed: 1 });
    expect(summary.otherStages).toEqual({ unknown_teams: 1, outside_match_window: 1 });
    expect(summary.toReview.map((entry) => entry.replayId)).toEqual(["incomplete", "failed"]);
    expect(summary.otherStageReplays).toBeNull();
    expect(summary.progress).toEqual({ processed: 6, total: 6 });
  });

  it("lists other-stage replays on request", () => {
    expect(
      summarizeStatsImport(statsImport, true).otherStageReplays?.map((entry) => entry.replayId),
    ).toEqual(["other-1", "other-2"]);
  });
});

describe("game stats tools", () => {
  it("registers every tool", () => {
    const { registerTool } = setup("admin");

    expect(registerTool.mock.calls.map((call) => call[0])).toEqual(TOOLS);
  });

  it("starts an import and reports the latest one", async () => {
    const { call, statsImportService } = setup("admin");

    expect(
      (await call("import_game_stats", { tournamentId: "t1", group: "rlcs-x1" })).body,
    ).toEqual({ id: "import-1", groupId: "rlcs-x1", status: "pending" });
    expect(statsImportService.request).toHaveBeenCalledWith("t1", "rlcs-x1");
    const { body } = await call("get_game_stats_import", { tournamentId: "t1" });
    expect(body.import).toMatchObject({ id: "import-1", status: "completed" });
    expect(body.import.toReview).toHaveLength(2);
  });

  it("answers null when the tournament has no import", async () => {
    const { call, statsImportService } = setup("admin");
    statsImportService.recent.mockResolvedValueOnce([]);

    expect((await call("get_game_stats_import", { tournamentId: "t1" })).body).toEqual({
      import: null,
    });
  });

  it("lists unlinked accounts by default and linked ones on request, then links", async () => {
    const { call, statsPlayerLinkService } = setup("admin");

    const unlinked = (await call("list_unlinked_game_players", { tournamentId: "t1" })).body;
    expect(unlinked.players.map((account: { name: string }) => account.name)).toEqual(["Racer"]);
    expect(unlinked.rosters).toEqual(accounts.rosters);
    const all = (
      await call("list_unlinked_game_players", { tournamentId: "t1", includeLinked: true })
    ).body;
    expect(all.players).toHaveLength(2);

    const link = {
      platform: "steam",
      platformId: "1",
      playerId: "0f8fad5b-d9cb-469f-a165-70867728950e",
    };
    expect((await call("link_game_player", { tournamentId: "t1", ...link })).body).toEqual({
      link,
      linkedRows: 7,
    });
    expect(statsPlayerLinkService.link).toHaveBeenCalledWith("t1", link);
  });

  it("attaches and removes games through the staff service", async () => {
    const { call, manualGameService } = setup("admin");
    const input = {
      matchId: "m1",
      replay: game.ballchasingId,
      gameNumber: 2,
      blueParticipantId: "p1",
    };

    expect((await call("attach_replay_to_game", { tournamentId: "t1", ...input })).body).toEqual(
      game,
    );
    expect(manualGameService.attach).toHaveBeenCalledWith("t1", input);
    expect(
      (await call("remove_match_game", { tournamentId: "t1", matchId: "m1", gameNumber: 2 })).body,
    ).toEqual(game);
    expect(manualGameService.remove).toHaveBeenCalledWith("t1", "m1", 2);
  });

  it("returns a refusal as a tool error", async () => {
    const { call, manualGameService } = setup("admin");
    manualGameService.attach.mockRejectedValueOnce(
      new ConflictError("This replay is already attached to game 3 of KC vs BDS in RLCS."),
    );

    const { result } = await call("attach_replay_to_game", {
      tournamentId: "t1",
      matchId: "m1",
      replay: game.ballchasingId,
      gameNumber: 2,
      blueParticipantId: "p1",
    });

    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "This replay is already attached to game 3 of KC vs BDS in RLCS." }],
    });
  });

  it("requires tournaments.manage for every tool", async () => {
    const { call, statsImportService, statsPlayerLinkService, manualGameService } =
      setup("journalist");

    for (const name of TOOLS) {
      const { result } = await call(name, {
        tournamentId: "t1",
        group: "rlcs-x1",
        platform: "steam",
        platformId: "1",
        playerId: "0f8fad5b-d9cb-469f-a165-70867728950e",
        matchId: "m1",
        replay: game.ballchasingId,
        gameNumber: 1,
        blueParticipantId: "p1",
      });
      expect(result.isError, name).toBe(true);
      expect(result.content[0].text).toContain("tournaments.manage");
    }
    for (const service of [statsImportService, statsPlayerLinkService, manualGameService])
      for (const method of Object.values(service)) expect(method).not.toHaveBeenCalled();
  });
});
