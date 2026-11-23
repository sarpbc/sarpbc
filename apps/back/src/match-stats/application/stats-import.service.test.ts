import { describe, expect, it } from "vitest";
import { MemoryGames } from "../../../test/memory-games";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { CandidateMatch, ReplaySummary } from "../domain/replay-matching";
import type { StatsImport } from "../domain/stats-import";
import { FakeBallchasing } from "./fake-ballchasing.test-utils";
import { FakeStatsCandidates } from "./fake-stats-candidates.test-utils";
import { RecordingScheduler } from "./recording-scheduler.test-utils";
import { SaveFailingGames } from "./save-failing-games.test-utils";
import type { GameRecord, StatsImportStore } from "./ports";
import { INTERRUPTED_IMPORT_ERROR, StatsImportService } from "./stats-import.service";

const KC = ["Vatira", "Atow", "Rise"];
const BDS = ["M0nkey M00n", "Seikoo", "ExoTiiK"];

const candidate: CandidateMatch = {
  beginAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  finished: true,
  id: "m1",
  numberOfGames: 5,
  participants: [
    { id: "p-kc", players: KC.map((name) => ({ id: name, name })), teamNames: ["Karmine Corp"] },
    { id: "p-bds", players: BDS.map((name) => ({ id: name, name })), teamNames: ["BDS"] },
  ],
  scores: new Map([
    ["p-kc", 1],
    ["p-bds", 1],
  ]),
  storedReplayIds: [],
};

const summary = (id: string, playedAt: string, kcBlue: boolean, blueGoals: number) => ({
  blue: { goals: blueGoals, name: null, playerNames: kcBlue ? KC : BDS },
  id,
  orange: { goals: blueGoals === 0 ? 1 : 0, name: null, playerNames: kcBlue ? BDS : KC },
  playedAt: new Date(playedAt),
  playedAtHasTimezone: true,
  rocketLeagueId: `guid-${id}`,
  title: id,
});

const game1 = summary("r1", "2026-06-01T18:05:00Z", true, 2);
const game2 = summary("r2", "2026-06-01T18:25:00Z", true, 0);

const stranger: ReplaySummary = {
  ...summary("r3", "2026-06-01T18:40:00Z", true, 1),
  blue: { goals: 1, name: null, playerNames: ["x", "y", "z"] },
};

const side = (names: string[], team: "blue" | "orange") =>
  names.map((name, index) => ({
    assists: 0,
    demolitions: index,
    goals: 0,
    name: index === 2 ? "Stand-in" : name,
    platform: "epic",
    platformId: `${name}-id`,
    saves: 1,
    shots: 1,
    side: team,
  }));

const statsFor = (replay: ReplaySummary) => ({
  blueGoals: replay.blue.goals,
  orangeGoals: replay.orange.goals,
  playedAt: replay.playedAt,
  players: [...side(replay.blue.playerNames, "blue"), ...side(replay.orange.playerNames, "orange")],
  rocketLeagueId: replay.rocketLeagueId,
});

const replayIdsOf = (game: GameRecord) => game.replays.map((replay) => replay.ballchasingId);

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

    for (const row of this.rows.values()) {
      if (row.status === "pending" || row.status === "running") {
        Object.assign(row, { error, finishedAt: new Date(), status: "failed" });
        changed += 1;
      }
    }

    return changed;
  }
}

const setup = (options: { replays?: ReplaySummary[] } = {}) => {
  const source = new FakeBallchasing(
    options.replays ?? [game2, stranger, game1],
    new Map([
      ["r1", statsFor(game1)],
      ["r2", statsFor(game2)],
    ]),
  );

  const games = new SaveFailingGames();

  const candidates = new FakeStatsCandidates(() => [
    {
      ...candidate,
      storedReplayIds: games.saved.flatMap(replayIdsOf),
    },
  ]);

  const imports = new MemoryImports();
  const failures: unknown[] = [];
  const scheduler = new RecordingScheduler();

  const service = new StatsImportService(source, candidates, games, imports, scheduler, (cause) => {
    failures.push(cause);
  });

  return { failures, games, imports, scheduler, service, source };
};

describe("StatsImportService.request", () => {
  it("queues a pending import for a valid group link and schedules its run", async () => {
    const { service, imports, scheduler } = setup();

    const statsImport = await service.request("t1", "https://ballchasing.com/group/pilot-abc123");

    expect(statsImport).toMatchObject({
      groupId: "pilot-abc123",
      status: "pending",
      tournamentId: "t1",
    });
    expect(imports.rows.get(statsImport.id)?.status).toBe("pending");
    expect(scheduler.tasks).toHaveLength(1);
    await scheduler.tasks[0]?.();
    expect(imports.rows.get(statsImport.id)?.status).toBe("completed");
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
      new FakeStatsCandidates(() => []),
      new MemoryGames(),
      imports,
      new RecordingScheduler(),
      () => {},
    );

    await expect(service.request("t1", "pilot-abc123")).rejects.toBeInstanceOf(IntegrationError);
  });
});

const runImport = async () => {
  const context = setup();
  const { id } = await context.service.request("t1", "pilot-abc123");

  await context.service.run(id);

  const done = context.imports.rows.get(id);

  if (done === undefined) {
    throw new Error("Import was not stored");
  }

  return { ...context, done };
};

describe("StatsImportService.run", () => {
  it("reports the rest and tracks progress", async () => {
    const { done, imports } = await runImport();

    expect(done.status).toBe("completed");
    expect(done.total).toBe(3);
    expect(done.processed).toBe(3);
    expect(done.items.map((item) => [item.replayId, item.status])).toStrictEqual([
      ["r1", "imported"],
      ["r2", "imported"],
      ["r3", "unmatched"],
    ]);
    expect(imports.saves.map((save) => save.processed)).toContain(1);
  });

  it("imports the matched games", async () => {
    const { games } = await runImport();

    expect(games.saved.map((game) => [replayIdsOf(game), game.number])).toStrictEqual([
      [["r1"], 1],
      [["r2"], 2],
    ]);
    expect(games.saved[0]).toMatchObject({
      blueParticipantId: "p-kc",
      matchId: "m1",
      orangeParticipantId: "p-bds",
      replays: [{ blueGoals: 2, orangeGoals: 0 }],
    });
    expect(
      games.saved[0].replays[0].players.map((player) => [player.name, player.playerId]),
    ).toStrictEqual([
      ["Vatira", "Vatira"],
      ["Atow", "Atow"],
      ["Stand-in", null],
      ["M0nkey M00n", "M0nkey M00n"],
      ["Seikoo", "Seikoo"],
      ["Stand-in", null],
    ]);
  });

  it("learns platform links from unique roster-name matches once", async () => {
    const { service, games } = setup({ replays: [game1, game2] });

    const response = await service.request("t1", "pilot-abc123");
    await service.run(response.id);

    expect(games.saved[0].learnedLinks).toStrictEqual([
      { platform: "epic", platformId: "Vatira-id", playerId: "Vatira" },
      { platform: "epic", platformId: "Atow-id", playerId: "Atow" },
      { platform: "epic", platformId: "M0nkey M00n-id", playerId: "M0nkey M00n" },
      { platform: "epic", platformId: "Seikoo-id", playerId: "Seikoo" },
    ]);
    expect(games.saved[1].learnedLinks).toStrictEqual([]);
    expect(games.saved[1].replays[0].players.map((player) => player.playerId)).toStrictEqual([
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
    expect(saved.replays[0].players.map((player) => [player.name, player.playerId])).toStrictEqual([
      ["Vatira", "Atow"],
      ["Atow", "Atow"],
      ["Stand-in", "outsider"],
      ["M0nkey M00n", "M0nkey M00n"],
      ["Seikoo", "Seikoo"],
      ["Stand-in", null],
    ]);
    expect(saved.learnedLinks.map((link) => link.platformId)).toStrictEqual([
      "Atow-id",
      "M0nkey M00n-id",
      "Seikoo-id",
    ]);
  });

  it("skips already imported replays on a rerun without fetching their stats", async () => {
    const { service, games, imports, source } = setup();
    const response3 = await service.request("t1", "pilot-abc123");
    await service.run(response3.id);
    source.statsCalls.splice(0);

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.statsCalls).toStrictEqual([]);
    expect(games.saved).toHaveLength(2);
    expect(imports.rows.get(id)?.items.map((item) => item.status)).toStrictEqual([
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
    source.statsCalls.splice(0);

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.statsCalls).toStrictEqual([]);
    expect(games.saved.flatMap(replayIdsOf)).toStrictEqual(["r1"]);
    expect(imports.rows.get(id)?.items).toStrictEqual([
      expect.objectContaining({ gameNumber: 1, replayId: "r1", status: "already_imported" }),
      expect.objectContaining({ reason: "excluded_by_staff", replayId: "r2", status: "unmatched" }),
      expect.objectContaining({
        blueParticipantId: null,
        matchId: null,
        reason: "unknown_teams",
        replayId: "r3",
      }),
    ]);
  });

  it("reports a game staff attached under another number where it is, and adds nothing", async () => {
    const { service, games, imports, source } = setup({ replays: [game1, game2] });
    games.saved.push({
      blueParticipantId: "p-kc",
      learnedLinks: [],
      matchId: "m1",
      number: 2,
      orangeParticipantId: "p-bds",
      replays: [
        {
          ballchasingId: "r1",
          blueGoals: 2,
          orangeGoals: 0,
          playedAt: game1.playedAt,
          players: [],
          rocketLeagueId: game1.rocketLeagueId,
        },
      ],
    });

    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);

    expect(source.statsCalls).toStrictEqual([]);
    expect(games.saved).toHaveLength(1);
    expect(imports.rows.get(id)?.items).toStrictEqual([
      expect.objectContaining({ gameNumber: 2, replayId: "r1", status: "already_imported" }),
      expect.objectContaining({
        blueParticipantId: "p-kc",
        matchId: "m1",
        reason: "match_has_other_stats",
        replayId: "r2",
        status: "unmatched",
      }),
    ]);
  });

  it("fails a game whose stats score disagrees with the list, or that is not processed yet", async () => {
    const { service, games, imports, source, failures } = setup();
    source.outcomes.set("r1", { ...statsFor(game1), blueGoals: 5 });
    source.outcomes.set("r2", null);
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(games.saved).toHaveLength(0);
    expect(imports.rows.get(id)?.items.slice(0, 2)).toStrictEqual([
      expect.objectContaining({ reason: "score_mismatch", replayId: "r1", status: "failed" }),
      expect.objectContaining({ reason: "replay_not_ready", replayId: "r2", status: "failed" }),
    ]);
    expect(failures).toStrictEqual([]);
  });

  it("fails a game when the replay is missing a team", async () => {
    const { service, imports, source } = setup({ replays: [game1, game2] });
    source.outcomes.set("r1", {
      ...statsFor(game1),
      players: statsFor(game1).players.filter((player) => player.side === "blue"),
    });
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items[0]).toMatchObject({ reason: "player_mismatch" });
  });

  it("records a fetch or save failure per game and keeps going", async () => {
    const { service, imports, source, games } = setup({ replays: [game1, game2] });
    source.outcomes.set("r1", new IntegrationError("gone"));
    games.failNextSave(new Error("unique violation"));
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.items).toStrictEqual([
      expect.objectContaining({
        blueParticipantId: "p-kc",
        gameNumber: 1,
        matchId: "m1",
        reason: "fetch_failed",
        replayId: "r1",
        status: "failed",
      }),
      expect.objectContaining({ reason: "save_failed", replayId: "r2", status: "failed" }),
    ]);
    expect(imports.rows.get(id)?.status).toBe("completed");
  });

  it("fails the import with the Ballchasing message when the group cannot be listed", async () => {
    const { service, imports, source, failures } = setup();
    source.groupFailure = new IntegrationError(
      "Ballchasing rejected the API key. Check BALLCHASING_API_KEY.",
    );
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)).toMatchObject({
      error: "Ballchasing rejected the API key. Check BALLCHASING_API_KEY.",
      status: "failed",
    });
    expect(failures).toStrictEqual([]);
  });

  it("hides unexpected errors behind a generic message and reports them", async () => {
    const { service, imports, source, failures } = setup();
    source.groupFailure = new Error("socket hang up");
    const { id } = await service.request("t1", "pilot-abc123");

    await service.run(id);

    expect(imports.rows.get(id)?.error).toMatch(/unexpectedly/u);
    expect(failures).toHaveLength(1);
  });

  it("only runs pending imports", async () => {
    const { service, source } = setup();
    const { id } = await service.request("t1", "pilot-abc123");
    await service.run(id);
    source.groupCalls.splice(0);

    await service.run(id);
    await service.run("unknown");

    expect(source.groupCalls).toStrictEqual([]);
  });
});

const FUT = ["FUT One", "FUT Two", "FUT Three"];
const WC = ["WC One", "WC Two", "WC Three"];
const VIT = ["VIT One", "VIT Two", "VIT Three"];

const participant = (id: string, names: string[], teamName: string) => ({
  id,
  players: names.map((name) => ({ id: name, name })),
  teamNames: [teamName],
});

const series = (id: string, beginAt: string, sides: [string, string[], string, number][]) => ({
  ...candidate,
  beginAt: new Date(beginAt),
  id,
  participants: sides.map(([participantId, names, teamName]) =>
    participant(participantId, names, teamName),
  ),
  scores: new Map(sides.map((entry) => [entry[0], entry[3]])),
});

interface Segment {
  title: string;
  playedAt: string;
  blue: string[];
  orange: string[];
  listScore: [number, number];
  ownGoals: [number, number];
}

const segment = ({ title, playedAt, blue, orange, listScore, ownGoals }: Segment) => {
  const listed: ReplaySummary = {
    blue: { goals: listScore[0], name: null, playerNames: blue },
    id: title,
    orange: { goals: listScore[1], name: null, playerNames: orange },
    playedAt: new Date(playedAt),
    playedAtHasTimezone: true,
    rocketLeagueId: `guid-${title}`,
    title,
  };

  const stats = {
    blueGoals: ownGoals[0],
    orangeGoals: ownGoals[1],
    playedAt: listed.playedAt,
    players: [...side(blue, "blue"), ...side(orange, "orange")],
    rocketLeagueId: listed.rocketLeagueId,
  };

  return { listed, stats };
};

const kcFut = (game: string, minute: number, listScore: [number, number], ownGoals = listScore) =>
  segment({
    blue: KC,
    listScore,
    orange: FUT,
    ownGoals,
    playedAt: `2026-11-15T14:${String(minute).padStart(2, "0")}:00Z`,
    title: `MAJOR_2 J KC vs FUT ${game}`,
  });

const wcVit = (game: string, minute: number, listScore: [number, number], ownGoals = listScore) =>
  segment({
    blue: WC,
    listScore,
    orange: VIT,
    ownGoals,
    playedAt: `2026-11-15T17:${String(minute).padStart(2, "0")}:00Z`,
    title: `MAJOR_2 I WC vs VIT ${game}`,
  });

const majorReplays = () => [
  kcFut("G1.1", 5, [1, 1]),
  kcFut("G1.2", 12, [1, 2], [0, 1]),
  kcFut("G2", 25, [2, 0]),
  kcFut("G3", 40, [0, 3]),
  kcFut("G4", 55, [1, 0]),
  kcFut("G5", 59, [4, 2]),
  wcVit("G1.1", 5, [0, 1]),
  wcVit("G1.2", 12, [0, 2], [0, 1]),
  wcVit("G2", 25, [0, 2]),
  wcVit("G3", 40, [1, 3]),
];

const importMajor = async (replays = majorReplays()) => {
  const source = new FakeBallchasing(
    replays.map(({ listed }) => listed),
    new Map(replays.map(({ stats, listed }) => [listed.id, stats])),
  );

  const games = new MemoryGames();

  const candidates = new FakeStatsCandidates(() => [
    series("kc-fut", "2026-11-15T14:00:00Z", [
      ["p-kc", KC, "Karmine Corp", 3],
      ["p-fut", FUT, "FUT Esports", 2],
    ]),
    series("wc-vit", "2026-11-15T17:00:00Z", [
      ["p-wc", WC, "Wildcard", 0],
      ["p-vit", VIT, "Team Vitality", 3],
    ]),
  ]);

  const imports = new MemoryImports();

  const service = new StatsImportService(
    source,
    candidates,
    games,
    imports,
    new RecordingScheduler(),
    () => {},
  );

  const { id } = await service.request("t1", "major-group");
  await service.run(id);

  return { games, items: imports.rows.get(id)?.items ?? [] };
};

describe("StatsImportService with a game split over several replays", () => {
  it("imports the Paris Major series with their crashed first games as one game each", async () => {
    const { games, items } = await importMajor();

    expect(items.map((item) => [item.replayId, item.status])).toStrictEqual(
      majorReplays().map(({ listed }) => [listed.id, "imported"]),
    );

    const gamesOf = (matchId: string, prefix: string) =>
      games.saved
        .filter((game) => game.matchId === matchId)
        .map((game) => [
          game.number,
          game.replays.map((replay) => [
            replay.ballchasingId.replace(prefix, ""),
            replay.blueGoals,
            replay.orangeGoals,
          ]),
        ]);

    expect(gamesOf("kc-fut", "MAJOR_2 J KC vs FUT ")).toStrictEqual([
      [
        1,
        [
          ["G1.1", 1, 1],
          ["G1.2", 0, 1],
        ],
      ],
      [2, [["G2", 2, 0]]],
      [3, [["G3", 0, 3]]],
      [4, [["G4", 1, 0]]],
      [5, [["G5", 4, 2]]],
    ]);
    expect(gamesOf("wc-vit", "MAJOR_2 I WC vs VIT ")).toStrictEqual([
      [
        1,
        [
          ["G1.1", 0, 1],
          ["G1.2", 0, 1],
        ],
      ],
      [2, [["G2", 0, 2]]],
      [3, [["G3", 1, 3]]],
    ]);
    expect(items.find((item) => item.replayId === "MAJOR_2 J KC vs FUT G1.2")).toMatchObject({
      gameNumber: 1,
      matchId: "kc-fut",
    });
  });

  it("fails every replay of a game when a restart's score does not add up", async () => {
    const replays = majorReplays();
    replays[1] = kcFut("G1.2", 12, [1, 2], [1, 1]);

    const { games, items } = await importMajor(replays);

    expect(
      items.filter((item) => item.status === "failed").map((item) => [item.replayId, item.reason]),
    ).toStrictEqual([
      ["MAJOR_2 J KC vs FUT G1.1", "score_mismatch"],
      ["MAJOR_2 J KC vs FUT G1.2", "score_mismatch"],
    ]);
    expect(games.saved.filter((game) => game.matchId === "kc-fut")).toHaveLength(4);
  });

  it("stores a restart that swapped sides in the game's orientation", async () => {
    const replays = majorReplays();

    replays[1] = segment({
      blue: FUT,
      listScore: [2, 1],
      orange: KC,
      ownGoals: [1, 0],
      playedAt: "2026-11-15T14:12:00Z",
      title: "MAJOR_2 J KC vs FUT G1.2",
    });

    const { games } = await importMajor(replays);
    const [first] = games.saved;

    expect(first?.blueParticipantId).toBe("p-kc");
    expect(first?.replays[1]).toMatchObject({ blueGoals: 0, orangeGoals: 1 });
    expect(
      first?.replays[1]?.players.map((player) => [player.side, player.playerId]).slice(0, 2),
    ).toStrictEqual([
      ["orange", "FUT One"],
      ["orange", "FUT Two"],
    ]);
  });
});

describe("StatsImportService maintenance", () => {
  it("marks unfinished imports as interrupted and lists recent ones", async () => {
    const { service } = setup();
    await service.request("t1", "pilot-abc123");

    await expect(service.failInterrupted()).resolves.toBe(1);
    const [latest] = await service.recent("t1");
    expect(latest).toMatchObject({ error: INTERRUPTED_IMPORT_ERROR, status: "failed" });
  });
});
