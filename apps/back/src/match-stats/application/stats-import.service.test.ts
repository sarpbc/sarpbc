import { describe, expect, it, vi } from "vitest";
import { MemoryGames } from "../../../test/memory-games";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { CandidateMatch, ReplaySummary } from "../domain/replay-matching";
import type { StatsImport } from "../domain/stats-import";
import type {
  BallchasingSource,
  ReplayStats,
  StatsCandidates,
  StatsImportScheduler,
  StatsImportStore,
} from "./ports";
import { INTERRUPTED_IMPORT_ERROR, StatsImportService } from "./stats-import.service";

const KC = ["Vatira", "Atow", "Rise"];
const BDS = ["M0nkey M00n", "Seikoo", "ExoTiiK"];

const candidate: CandidateMatch = {
  id: "m1",
  beginAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  finished: true,
  numberOfGames: 5,
  participants: [
    { id: "p-kc", teamNames: ["Karmine Corp"], players: KC.map((name) => ({ id: name, name })) },
    { id: "p-bds", teamNames: ["BDS"], players: BDS.map((name) => ({ id: name, name })) },
  ],
  scores: new Map([
    ["p-kc", 1],
    ["p-bds", 1],
  ]),
  storedReplayIds: [],
};

function summary(id: string, playedAt: string, kcBlue: boolean, blueGoals: number): ReplaySummary {
  return {
    id,
    rocketLeagueId: `guid-${id}`,
    title: id,
    playedAt: new Date(playedAt),
    playedAtHasTimezone: true,
    blue: { name: null, goals: blueGoals, playerNames: kcBlue ? KC : BDS },
    orange: { name: null, goals: blueGoals === 0 ? 1 : 0, playerNames: kcBlue ? BDS : KC },
  };
}

const game1 = summary("r1", "2026-06-01T18:05:00Z", true, 2);
const game2 = summary("r2", "2026-06-01T18:25:00Z", true, 0);

const stranger: ReplaySummary = {
  ...summary("r3", "2026-06-01T18:40:00Z", true, 1),
  blue: { name: null, goals: 1, playerNames: ["x", "y", "z"] },
};

const side = (names: string[], team: "blue" | "orange") =>
  names.map((name, index) => ({
    name: index === 2 ? "Stand-in" : name,
    platform: "epic",
    platformId: `${name}-id`,
    side: team,
    goals: 0,
    assists: 0,
    saves: 1,
    shots: 1,
    demolitions: index,
  }));

function statsFor(replay: ReplaySummary): ReplayStats {
  return {
    rocketLeagueId: replay.rocketLeagueId,
    playedAt: replay.playedAt,
    blueGoals: replay.blue.goals,
    orangeGoals: replay.orange.goals,
    players: [
      ...side(replay.blue.playerNames, "blue"),
      ...side(replay.orange.playerNames, "orange"),
    ],
  };
}

class MemoryImports implements StatsImportStore {
  rows = new Map<string, StatsImport>();
  saves: StatsImport[] = [];
  async create(statsImport: StatsImport) {
    this.rows.set(statsImport.id, structuredClone(statsImport));
  }
  async load(id: string) {
    const row = this.rows.get(id);

    return row ? structuredClone(row) : null;
  }
  async save(statsImport: StatsImport) {
    this.rows.set(statsImport.id, structuredClone(statsImport));
    this.saves.push(structuredClone(statsImport));
  }
  async latest(tournamentId: string, limit: number) {
    return [...this.rows.values()]
      .filter((row) => row.tournamentId === tournamentId)
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  async failUnfinished(error: string) {
    let changed = 0;

    for (const row of this.rows.values())
      if (row.status === "pending" || row.status === "running") {
        Object.assign(row, { status: "failed", error, finishedAt: new Date() });
        changed += 1;
      }

    return changed;
  }
}

function setup(options: { replays?: ReplaySummary[] } = {}) {
  const source = {
    groupReplays: vi.fn<BallchasingSource["groupReplays"]>(
      async () => options.replays ?? [game2, stranger, game1],
    ),
    replayStats: vi.fn<BallchasingSource["replayStats"]>(async (id) => {
      const replay = [game1, game2].find((known) => known.id === id);

      if (replay === undefined) throw new Error(`Unknown replay ${id}`);

      return statsFor(replay);
    }),
  } satisfies BallchasingSource;

  const games = new MemoryGames();

  const candidates: StatsCandidates = {
    tournamentExists: vi.fn(async (id: string) => id === "t1"),
    matches: vi.fn(async () => [
      {
        ...candidate,
        storedReplayIds: games.saved.map((game) => game.ballchasingId),
      },
    ]),
  };

  const imports = new MemoryImports();
  const reportFailure = vi.fn<(cause: unknown) => void>();
  const scheduler = { schedule: vi.fn<StatsImportScheduler["schedule"]>() };

  const service = new StatsImportService(
    source,
    candidates,
    games,
    imports,
    scheduler,
    reportFailure,
  );

  return { service, source, games, imports, scheduler, reportFailure };
}

describe("StatsImportService.request", () => {
  it("queues a pending import for a valid group link and schedules its run", async () => {
    const { service, imports, scheduler, source } = setup();

    const statsImport = await service.request("t1", "https://ballchasing.com/group/pilot-abc123");

    expect(statsImport).toMatchObject({
      tournamentId: "t1",
      groupId: "pilot-abc123",
      status: "pending",
    });
    expect(imports.rows.get(statsImport.id)?.status).toBe("pending");
    expect(scheduler.schedule).toHaveBeenCalledOnce();
    await scheduler.schedule.mock.calls[0][0]();
    expect(imports.rows.get(statsImport.id)?.status).toBe("completed");
    expect(source.groupReplays).toHaveBeenCalledWith("pilot-abc123");
  });

  it("rejects unknown tournaments, invalid groups and a second active import", async () => {
    const { service } = setup();

    await expect(service.request("missing", "pilot-abc123")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.request("t1", "https://example.com")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await service.request("t1", "pilot-abc123");
    await expect(service.request("t1", "pilot-abc123")).rejects.toBeInstanceOf(ConflictError);
  });

  it("explains a missing API key", async () => {
    const { imports } = setup();

    const service = new StatsImportService(
      null,
      { tournamentExists: vi.fn(), matches: vi.fn() },
      new MemoryGames(),
      imports,
      { schedule: vi.fn<StatsImportScheduler["schedule"]>() },
      vi.fn<(cause: unknown) => void>(),
    );

    await expect(service.request("t1", "pilot-abc123")).rejects.toBeInstanceOf(IntegrationError);
  });
});

describe("StatsImportService.run", () => {
  it("imports matched games, reports the rest and tracks progress", async () => {
    const { service, games, imports, source } = setup();
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    const done = imports.rows.get(id);

    if (done === undefined) throw new Error("Import was not stored");

    expect(done.status).toBe("completed");
    expect(done.total).toBe(3);
    expect(done.processed).toBe(3);
    expect(done.items.map((item) => [item.replayId, item.status])).toEqual([
      ["r1", "imported"],
      ["r2", "imported"],
      ["r3", "unmatched"],
    ]);
    expect(source.replayStats).toHaveBeenCalledTimes(2);
    expect(games.saved.map((game) => [game.ballchasingId, game.number])).toEqual([
      ["r1", 1],
      ["r2", 2],
    ]);
    expect(games.saved[0]).toMatchObject({
      matchId: "m1",
      blueParticipantId: "p-kc",
      orangeParticipantId: "p-bds",
      blueGoals: 2,
      orangeGoals: 0,
    });
    expect(games.saved[0].players.map((player) => [player.name, player.playerId])).toEqual([
      ["Vatira", "Vatira"],
      ["Atow", "Atow"],
      ["Stand-in", null],
      ["M0nkey M00n", "M0nkey M00n"],
      ["Seikoo", "Seikoo"],
      ["Stand-in", null],
    ]);
    expect(imports.saves.map((save) => save.processed)).toContain(1);
  });

  it("learns platform links from unique roster-name matches once", async () => {
    const { service, games } = setup({ replays: [game1, game2] });

    const response = await service.request("t1", "pilot-abc123");
    await service.run(response.id);

    expect(games.saved[0].learnedLinks).toEqual([
      { platform: "epic", platformId: "Vatira-id", playerId: "Vatira" },
      { platform: "epic", platformId: "Atow-id", playerId: "Atow" },
      { platform: "epic", platformId: "M0nkey M00n-id", playerId: "M0nkey M00n" },
      { platform: "epic", platformId: "Seikoo-id", playerId: "Seikoo" },
    ]);
    expect(games.saved[1].learnedLinks).toEqual([]);
    expect(games.saved[1].players.map((player) => player.playerId)).toEqual([
      "Vatira",
      "Atow",
      null,
      "M0nkey M00n",
      "Seikoo",
      null,
    ]);
  });

  it("prefers an existing link over a name match and links stand-ins off the roster", async () => {
    const { service, games } = setup({ replays: [game1, game2] });
    games.linked = [
      { platform: "epic", platformId: "Vatira-id", playerId: "Atow" },
      { platform: "epic", platformId: "Rise-id", playerId: "outsider" },
      { platform: "steam", platformId: "Seikoo-id", playerId: "other-platform" },
    ];

    const response2 = await service.request("t1", "pilot-abc123");
    await service.run(response2.id);

    const [saved] = games.saved;
    expect(saved.players.map((player) => [player.name, player.playerId])).toEqual([
      ["Vatira", "Atow"],
      ["Atow", "Atow"],
      ["Stand-in", "outsider"],
      ["M0nkey M00n", "M0nkey M00n"],
      ["Seikoo", "Seikoo"],
      ["Stand-in", null],
    ]);
    expect(saved.learnedLinks.map((link) => link.platformId)).toEqual([
      "Atow-id",
      "M0nkey M00n-id",
      "Seikoo-id",
    ]);
  });

  it("skips already imported replays on a rerun without fetching their stats", async () => {
    const { service, games, imports, source } = setup();
    const response3 = await service.request("t1", "pilot-abc123");
    await service.run(response3.id);
    source.replayStats.mockClear();

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.saved).toHaveLength(2);
    expect(imports.rows.get(id)?.items.map((item) => item.status)).toEqual([
      "already_imported",
      "already_imported",
      "unmatched",
    ]);
  });

  it("leaves a replay staff removed out of a later run, without fetching it", async () => {
    const { service, games, imports, source } = setup();
    const response4 = await service.request("t1", "pilot-abc123");
    await service.run(response4.id);
    await games.remove("t1", { matchId: "m1", number: 2 });
    source.replayStats.mockClear();

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.saved.map((game) => game.ballchasingId)).toEqual(["r1"]);
    expect(imports.rows.get(id)?.items).toEqual([
      expect.objectContaining({ replayId: "r1", status: "already_imported", gameNumber: 1 }),
      expect.objectContaining({ replayId: "r2", status: "unmatched", reason: "excluded_by_staff" }),
      expect.objectContaining({
        replayId: "r3",
        reason: "unknown_teams",
        matchId: null,
        blueParticipantId: null,
      }),
    ]);
  });

  it("reports a game staff attached under another number where it is, and adds nothing", async () => {
    const { service, games, imports, source } = setup({ replays: [game1, game2] });
    games.saved.push({
      matchId: "m1",
      number: 2,
      ballchasingId: "r1",
      rocketLeagueId: game1.rocketLeagueId,
      playedAt: game1.playedAt,
      blueParticipantId: "p-kc",
      orangeParticipantId: "p-bds",
      blueGoals: 2,
      orangeGoals: 0,
      players: [],
      learnedLinks: [],
    });

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.saved).toHaveLength(1);
    expect(imports.rows.get(id)?.items).toEqual([
      expect.objectContaining({ replayId: "r1", status: "already_imported", gameNumber: 2 }),
      expect.objectContaining({
        replayId: "r2",
        status: "unmatched",
        reason: "match_has_other_stats",
        matchId: "m1",
        blueParticipantId: "p-kc",
      }),
    ]);
  });

  it("fails a game whose stats score disagrees with the list, or that is not processed yet", async () => {
    const { service, games, imports, source, reportFailure } = setup();
    source.replayStats
      .mockResolvedValueOnce({ ...statsFor(game1), blueGoals: 5 })
      .mockResolvedValueOnce(null);
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(games.saved).toHaveLength(0);
    expect(imports.rows.get(id)?.items.slice(0, 2)).toEqual([
      expect.objectContaining({ replayId: "r1", status: "failed", reason: "score_mismatch" }),
      expect.objectContaining({ replayId: "r2", status: "failed", reason: "replay_not_ready" }),
    ]);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it("fails a game when the replay is missing a team", async () => {
    const { service, imports, source } = setup({ replays: [game1, game2] });
    source.replayStats.mockResolvedValueOnce({
      ...statsFor(game1),
      players: statsFor(game1).players.filter((player) => player.side === "blue"),
    });
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items[0]).toMatchObject({ reason: "player_mismatch" });
  });

  it("records a fetch or save failure per game and keeps going", async () => {
    const { service, imports, source, games } = setup({ replays: [game1, game2] });
    source.replayStats.mockRejectedValueOnce(new IntegrationError("gone"));
    vi.spyOn(games, "save").mockRejectedValueOnce(new Error("unique violation"));
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items).toEqual([
      expect.objectContaining({
        replayId: "r1",
        status: "failed",
        reason: "fetch_failed",
        matchId: "m1",
        gameNumber: 1,
        blueParticipantId: "p-kc",
      }),
      expect.objectContaining({ replayId: "r2", status: "failed", reason: "save_failed" }),
    ]);
    expect(imports.rows.get(id)?.status).toBe("completed");
  });

  it("fails the import with the Ballchasing message when the group cannot be listed", async () => {
    const { service, imports, source, reportFailure } = setup();
    source.groupReplays.mockRejectedValueOnce(
      new IntegrationError("Ballchasing rejected the API key. Check BALLCHASING_API_KEY."),
    );
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)).toMatchObject({
      status: "failed",
      error: "Ballchasing rejected the API key. Check BALLCHASING_API_KEY.",
    });
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it("hides unexpected errors behind a generic message and reports them", async () => {
    const { service, imports, source, reportFailure } = setup();
    source.groupReplays.mockRejectedValueOnce(new Error("socket hang up"));
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.error).toMatch(/unexpectedly/);
    expect(reportFailure).toHaveBeenCalledOnce();
  });

  it("only runs pending imports", async () => {
    const { service, source } = setup();
    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);
    source.groupReplays.mockClear();

    await service.run(id);
    await service.run("unknown");

    expect(source.groupReplays).not.toHaveBeenCalled();
  });
});

describe("StatsImportService maintenance", () => {
  it("marks unfinished imports as interrupted and lists recent ones", async () => {
    const { service } = setup();
    await service.request("t1", "pilot-abc123");

    expect(await service.failInterrupted()).toBe(1);
    const [latest] = await service.recent("t1");
    expect(latest).toMatchObject({ status: "failed", error: INTERRUPTED_IMPORT_ERROR });
  });
});
