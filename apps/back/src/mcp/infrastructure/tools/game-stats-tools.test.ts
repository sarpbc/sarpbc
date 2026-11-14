import { describe, expect, it, vi } from "vitest";
import type { StatsImportItem, StatsPlayerAccounts, TournamentStatsGame } from "@sarpbc/types";
import { jsonOf, textOf } from "../../../../test/mcp-result";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import type { StatsImport } from "../../../match-stats/domain/stats-import";
import type { ManualGameService } from "../../../match-stats/application/manual-game.service";
import type { StatsImportService } from "../../../match-stats/application/stats-import.service";
import type { StatsPlayerLinkService } from "../../../match-stats/application/stats-player-link.service";
import { gameStatsTools, summarizeStatsImport } from "./game-stats-tools";

const TOOLS = [
  "import_game_stats",
  "get_game_stats_import",
  "list_unlinked_game_players",
  "link_game_player",
  "attach_replay_to_game",
  "remove_match_game",
];

const base = (replayId: string) => ({ playedAt: null, replayId, title: replayId });

const stored = (
  replayId: string,
  status: "imported" | "already_imported",
  gameNumber: number,
): StatsImportItem => ({ ...base(replayId), gameNumber, matchId: "m1", status });

const unmatched = (
  replayId: string,
  reason: Extract<StatsImportItem, { status: "unmatched" }>["reason"] = "unknown_teams",
  matchId: string | null = null,
): StatsImportItem => ({
  ...base(replayId),
  blueParticipantId: null,
  matchId,
  reason,
  status: "unmatched",
});

const statsImport: StatsImport = {
  createdAt: new Date("2026-06-02T10:00:00Z"),
  error: null,
  finishedAt: new Date("2026-06-02T10:05:00Z"),
  groupId: "rlcs-x1",
  id: "import-1",
  items: [
    stored("imported", "imported", 1),
    stored("stored", "already_imported", 2),
    unmatched("other-1"),
    unmatched("other-2", "outside_match_window"),
    unmatched("incomplete", "incomplete_series", "m2"),
    {
      ...base("failed"),
      blueParticipantId: "p1",
      gameNumber: 3,
      matchId: "m1",
      reason: "fetch_failed",
      status: "failed",
    },
  ],
  processed: 6,
  startedAt: new Date("2026-06-02T10:00:01Z"),
  status: "completed",
  total: 6,
  tournamentId: "t1",
};

const accounts: StatsPlayerAccounts = {
  players: [
    {
      games: 4,
      name: "Racer",
      platform: "steam",
      platformId: "1",
      player: null,
      team: { name: "Vitality", participantId: "p1" },
    },
    {
      games: 4,
      name: "zen",
      platform: "steam",
      platformId: "2",
      player: { id: "zen", name: "zen" },
      team: { name: "Vitality", participantId: "p1" },
    },
  ],
  rosters: [{ participantId: "p1", players: [{ id: "zen", name: "zen" }], teamName: "Vitality" }],
};

const game: TournamentStatsGame = {
  ballchasingId: "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  blueGoals: 3,
  blueParticipantId: "p1",
  matchId: "m1",
  number: 2,
  orangeGoals: 1,
  orangeParticipantId: "p2",
  playedAt: null,
};

const setup = (role: "admin" | "journalist") => {
  const statsImportService = {
    recent: vi.fn<StatsImportService["recent"]>(async () => [statsImport]),
    request: vi.fn<StatsImportService["request"]>(async () => ({
      ...statsImport,
      items: [],
      status: "pending" as const,
    })),
  };

  const statsPlayerLinkService = {
    accounts: vi.fn<StatsPlayerLinkService["accounts"]>(async () => accounts),
    link: vi.fn<StatsPlayerLinkService["link"]>(async () => 7),
  };

  const manualGameService = {
    attach: vi.fn<ManualGameService["attach"]>(async () => game),
    remove: vi.fn<ManualGameService["remove"]>(async () => game),
  };

  const tools = gameStatsTools({ manualGameService, statsImportService, statsPlayerLinkService });

  const call = async (name: string, input: Record<string, string | number | boolean>) => {
    const tool = tools.find((defined) => defined.name === name);

    if (!tool) {
      throw new Error(`${name} is not defined`);
    }

    const result = await tool.run({ email: "staff@test.com", id: "u1", role }, input);
    const text = textOf(result);

    return { body: result.isError === true ? null : jsonOf(result), result, text };
  };

  return { call, manualGameService, statsImportService, statsPlayerLinkService, tools };
};

describe(summarizeStatsImport, () => {
  it("counts other-stage replays and lists only the ones staff should review", () => {
    const summary = summarizeStatsImport(statsImport, false);

    expect(summary.counts).toStrictEqual({
      already_imported: 1,
      failed: 1,
      imported: 1,
      unmatched: 3,
    });
    expect(summary.otherStages).toStrictEqual({ outside_match_window: 1, unknown_teams: 1 });
    expect(summary.toReview.map((entry) => entry.replayId)).toStrictEqual(["incomplete", "failed"]);
    expect(summary.otherStageReplays).toBeNull();
    expect(summary.progress).toStrictEqual({ processed: 6, total: 6 });
  });

  it("lists other-stage replays on request", () => {
    expect(
      summarizeStatsImport(statsImport, true).otherStageReplays?.map((entry) => entry.replayId),
    ).toStrictEqual(["other-1", "other-2"]);
  });
});

describe("game stats tools", () => {
  it("defines every tool", () => {
    const { tools } = setup("admin");

    expect(tools.map((tool) => tool.name)).toStrictEqual(TOOLS);
  });

  it("starts an import and reports the latest one", async () => {
    const { call, statsImportService } = setup("admin");

    const callResult = await call("import_game_stats", { group: "rlcs-x1", tournamentId: "t1" });
    expect(callResult.body).toStrictEqual({
      groupId: "rlcs-x1",
      id: "import-1",
      status: "pending",
    });
    expect(statsImportService.request).toHaveBeenCalledWith("t1", "rlcs-x1");
    const { body } = await call("get_game_stats_import", { tournamentId: "t1" });
    expect(body).toMatchObject({
      import: { id: "import-1", status: "completed", toReview: [{}, {}] },
    });
  });

  it("answers null when the tournament has no import", async () => {
    const { call, statsImportService } = setup("admin");
    statsImportService.recent.mockResolvedValueOnce([]);

    const callResult2 = await call("get_game_stats_import", { tournamentId: "t1" });
    expect(callResult2.body).toStrictEqual({
      import: null,
    });
  });

  it("lists unlinked accounts by default and linked ones on request, then links", async () => {
    const { call, statsPlayerLinkService } = setup("admin");

    const callResult3 = await call("list_unlinked_game_players", { tournamentId: "t1" });
    const unlinked = callResult3.body;
    expect(unlinked).toMatchObject({
      players: [expect.objectContaining({ name: "Racer" })],
      rosters: accounts.rosters,
    });

    const callResult4 = await call("list_unlinked_game_players", {
      includeLinked: true,
      tournamentId: "t1",
    });

    const all = callResult4.body;

    expect(all).toMatchObject({ players: [{}, {}] });

    const link = {
      platform: "steam",
      platformId: "1",
      playerId: "0f8fad5b-d9cb-469f-a165-70867728950e",
    };

    const callResult5 = await call("link_game_player", { tournamentId: "t1", ...link });
    expect(callResult5.body).toStrictEqual({
      link,
      linkedRows: 7,
    });
    expect(statsPlayerLinkService.link).toHaveBeenCalledWith("t1", link);
  });

  it("attaches and removes games through the staff service", async () => {
    const { call, manualGameService } = setup("admin");

    const input = {
      blueParticipantId: "p1",
      gameNumber: 2,
      matchId: "m1",
      replay: game.ballchasingId,
    };

    const callResult6 = await call("attach_replay_to_game", { tournamentId: "t1", ...input });
    expect(callResult6.body).toStrictEqual(game);
    expect(manualGameService.attach).toHaveBeenCalledWith("t1", input);

    const callResult7 = await call("remove_match_game", {
      gameNumber: 2,
      matchId: "m1",
      tournamentId: "t1",
    });

    expect(callResult7.body).toStrictEqual(game);
    expect(manualGameService.remove).toHaveBeenCalledWith("t1", "m1", 2);
  });

  it("returns a refusal as a tool error", async () => {
    const { call, manualGameService } = setup("admin");
    manualGameService.attach.mockRejectedValueOnce(
      new ConflictError("This replay is already attached to game 3 of KC vs BDS in RLCS."),
    );

    const { result } = await call("attach_replay_to_game", {
      blueParticipantId: "p1",
      gameNumber: 2,
      matchId: "m1",
      replay: game.ballchasingId,
      tournamentId: "t1",
    });

    expect(result).toMatchObject({
      content: [{ text: "This replay is already attached to game 3 of KC vs BDS in RLCS." }],
      isError: true,
    });
  });

  it.each(TOOLS)("requires tournaments.manage for %s", async (name) => {
    const { call, statsImportService, statsPlayerLinkService, manualGameService } =
      setup("journalist");

    const { result, text } = await call(name, {
      blueParticipantId: "p1",
      gameNumber: 1,
      group: "rlcs-x1",
      matchId: "m1",
      platform: "steam",
      platformId: "1",
      playerId: "0f8fad5b-d9cb-469f-a165-70867728950e",
      replay: game.ballchasingId,
      tournamentId: "t1",
    });

    expect(result.isError).toBe(true);
    expect(text).toContain("tournaments.manage");

    for (const service of [statsImportService, statsPlayerLinkService, manualGameService]) {
      for (const method of Object.values(service)) {
        expect(method).not.toHaveBeenCalled();
      }
    }
  });
});
