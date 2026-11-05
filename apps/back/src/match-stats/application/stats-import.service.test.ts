import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  IntegrationError,
  InvalidInputError,
  NotFoundError,
} from "../../common/domain/errors";
import type { CandidateMatch, ReplaySummary } from "../domain/replay-matching";
import type { StatsImport } from "../domain/stats-import";
import type {
  BallchasingSource,
  GameRecord,
  GameStatsStore,
  ParsedReplay,
  ReplayParser,
  StatsCandidates,
  StatsImportStore,
} from "./ports";
import { INTERRUPTED_IMPORT_ERROR, StatsImportService } from "./stats-import.service";

const KC = ["Vatira", "Atow", "Rise"];
const BDS = ["M0nkey M00n", "Seikoo", "ExoTiiK"];

const candidate: CandidateMatch = {
  id: "m1",
  beginAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  numberOfGames: 5,
  participants: [
    { id: "p-kc", teamName: "Karmine Corp", players: KC.map((name) => ({ id: name, name })) },
    { id: "p-bds", teamName: "BDS", players: BDS.map((name) => ({ id: name, name })) },
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

function parsedFor(replay: ReplaySummary): ParsedReplay {
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
  return {
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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

class MemoryGames implements GameStatsStore {
  saved: GameRecord[] = [];
  async importedReplayIds(ids: string[]) {
    return new Set(this.saved.map((game) => game.ballchasingId).filter((id) => ids.includes(id)));
  }
  async save(game: GameRecord) {
    this.saved.push(game);
  }
  async byMatch() {
    return [];
  }
}

function setup(options: { replays?: ReplaySummary[]; parser?: ReplayParser } = {}) {
  const source: BallchasingSource = {
    groupReplays: vi.fn(async () => options.replays ?? [game2, stranger, game1]),
    download: vi.fn(async (id: string) => new TextEncoder().encode(id)),
  };
  const parser: ReplayParser = options.parser ?? {
    parse: vi.fn(async (file: Uint8Array) => {
      const id = new TextDecoder().decode(file);
      return parsedFor([game1, game2].find((replay) => replay.id === id) as ReplaySummary);
    }),
  };
  const candidates: StatsCandidates = {
    tournamentExists: vi.fn(async (id: string) => id === "t1"),
    matches: vi.fn(async () => [
      {
        ...candidate,
        storedReplayIds: games.saved.map((game) => game.ballchasingId),
      },
    ]),
  };
  const games = new MemoryGames();
  const imports = new MemoryImports();
  const reportFailure = vi.fn();
  const service = new StatsImportService(source, parser, candidates, games, imports, reportFailure);
  return { service, source, parser, games, imports, reportFailure };
}

describe("StatsImportService.request", () => {
  it("queues a pending import for a valid group link", async () => {
    const { service, imports } = setup();

    const statsImport = await service.request("t1", "https://ballchasing.com/group/pilot-abc123");

    expect(statsImport).toMatchObject({
      tournamentId: "t1",
      groupId: "pilot-abc123",
      status: "pending",
    });
    expect(imports.rows.get(statsImport.id)?.status).toBe("pending");
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
      { parse: vi.fn() },
      { tournamentExists: vi.fn(), matches: vi.fn() },
      new MemoryGames(),
      imports,
      vi.fn(),
    );

    await expect(service.request("t1", "pilot-abc123")).rejects.toBeInstanceOf(IntegrationError);
  });
});

describe("StatsImportService.run", () => {
  it("imports matched games, reports the rest and tracks progress", async () => {
    const { service, games, imports, source } = setup();
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    const done = imports.rows.get(id) as StatsImport;
    expect(done.status).toBe("completed");
    expect(done.total).toBe(3);
    expect(done.processed).toBe(3);
    expect(done.items.map((item) => [item.replayId, item.status])).toEqual([
      ["r1", "imported"],
      ["r2", "imported"],
      ["r3", "unmatched"],
    ]);
    expect(source.download).toHaveBeenCalledTimes(2);
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

  it("skips already imported replays on a rerun without downloading them", async () => {
    const { service, games, imports, source } = setup();
    await service.run((await service.request("t1", "pilot-abc123")).id);
    vi.mocked(source.download).mockClear();

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.download).not.toHaveBeenCalled();
    expect(games.saved).toHaveLength(2);
    expect(imports.rows.get(id)?.items.map((item) => item.status)).toEqual([
      "already_imported",
      "already_imported",
      "unmatched",
    ]);
  });

  it("fails a game whose parsed score disagrees with Ballchasing, or that cannot be parsed", async () => {
    const parse = vi
      .fn<ReplayParser["parse"]>()
      .mockResolvedValueOnce({ ...parsedFor(game1), blueGoals: 5 })
      .mockRejectedValueOnce(new Error("boxcars crashed"));
    const { service, games, imports, reportFailure } = setup({ parser: { parse } });
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(games.saved).toHaveLength(0);
    expect(imports.rows.get(id)?.items.slice(0, 2)).toEqual([
      expect.objectContaining({ replayId: "r1", status: "failed", reason: "score_mismatch" }),
      expect.objectContaining({ replayId: "r2", status: "failed", reason: "parse_failed" }),
    ]);
    expect(reportFailure).toHaveBeenCalledOnce();
  });

  it("fails a game when the replay is missing a team", async () => {
    const parse = vi.fn(async () => ({
      ...parsedFor(game1),
      players: parsedFor(game1).players.filter((player) => player.side === "blue"),
    }));
    const { service, imports } = setup({ parser: { parse }, replays: [game1, game2] });
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items[0]).toMatchObject({ reason: "player_mismatch" });
  });

  it("records a download or save failure per game and keeps going", async () => {
    const { service, imports, source, games } = setup({ replays: [game1, game2] });
    vi.mocked(source.download).mockRejectedValueOnce(new IntegrationError("gone"));
    vi.spyOn(games, "save").mockRejectedValueOnce(new Error("unique violation"));
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items).toEqual([
      expect.objectContaining({ replayId: "r1", status: "failed", reason: "download_failed" }),
      expect.objectContaining({ replayId: "r2", status: "failed", reason: "save_failed" }),
    ]);
    expect(imports.rows.get(id)?.status).toBe("completed");
  });

  it("fails the import with the Ballchasing message when the group cannot be listed", async () => {
    const { service, imports, source, reportFailure } = setup();
    vi.mocked(source.groupReplays).mockRejectedValueOnce(
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
    vi.mocked(source.groupReplays).mockRejectedValueOnce(new Error("socket hang up"));
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.error).toMatch(/unexpectedly/);
    expect(reportFailure).toHaveBeenCalledOnce();
  });

  it("only runs pending imports", async () => {
    const { service, source } = setup();
    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);
    vi.mocked(source.groupReplays).mockClear();

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
