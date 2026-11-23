import { describe, expect, it } from "vitest";
import { MemoryGames } from "../../../test/memory-games";
import { ApplicationError } from "../../common/domain/errors/application-error";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import type { CandidateMatch } from "../domain/replay-matching";
import { ManualGameService } from "./manual-game.service";
import { FakeBallchasing } from "./fake-ballchasing.test-utils";
import { FakeStatsCandidates } from "./fake-stats-candidates.test-utils";
import type { GameAttachment, GameRecord, ReplayStats } from "./ports";

const REPLAY = "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const PLAYED_AT = new Date("2026-06-01T18:05:00Z");

const match: CandidateMatch = {
  beginAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  finished: true,
  id: "m1",
  numberOfGames: 5,
  participants: [
    { id: "p-kc", players: [{ id: "vatira", name: "Vatira" }], teamNames: ["Karmine Corp"] },
    { id: "p-bds", players: [{ id: "seikoo", name: "Seikoo" }], teamNames: ["BDS"] },
  ],
  scores: new Map(),
  storedReplayIds: ["5e1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"],
};

const line = (name: string, platformId: string) => ({
  assists: 0,
  demolitions: 0,
  goals: 1,
  name,
  platform: "steam",
  platformId,
  saves: 2,
  shots: 3,
});

const stats: ReplayStats = {
  blueGoals: 1,
  orangeGoals: 3,
  playedAt: PLAYED_AT,
  players: [
    { ...line("Seikoo", "seikoo-id"), side: "blue" },
    { ...line("Stand-in", "stand-in-id"), side: "orange" },
  ],
  rocketLeagueId: "RL-1",
};

const rejection = async (work: Promise<unknown>) => {
  const [settled] = await Promise.allSettled([work]);

  if (settled.status === "rejected" && settled.reason instanceof ApplicationError) {
    return settled.reason;
  }

  throw new Error("Expected an ApplicationError rejection", { cause: settled });
};

const input = {
  blueParticipantId: "p-bds",
  gameNumber: 2,
  matchId: "m1",
  replay: `https://ballchasing.com/replay/${REPLAY}`,
};

const STORED = "5e1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const storedGame: GameRecord = {
  blueParticipantId: "p-kc",
  learnedLinks: [],
  matchId: "m1",
  number: 1,
  orangeParticipantId: "p-bds",
  replays: [
    {
      ballchasingId: STORED,
      blueGoals: 1,
      orangeGoals: 0,
      playedAt: null,
      players: [],
      rocketLeagueId: null,
    },
  ],
};

const storedSummary = {
  blueGoals: 1,
  blueParticipantId: "p-kc",
  matchId: "m1",
  number: 1,
  orangeGoals: 0,
  orangeParticipantId: "p-bds",
  playedAt: null,
  replays: [{ ballchasingId: STORED, blueGoals: 1, orangeGoals: 0, playedAt: null }],
};

const added = (games: MemoryGames) => games.saved.filter((game) => game !== storedGame);

const setup = (
  options: {
    source?: boolean;
    numberOfGames?: number | null;
    participants?: CandidateMatch["participants"];
  } = {},
) => {
  const source = new FakeBallchasing([], new Map([[REPLAY, stats]]));

  const candidates = new FakeStatsCandidates(() => [
    {
      ...match,
      numberOfGames: options.numberOfGames === undefined ? 5 : options.numberOfGames,
      participants: options.participants ?? match.participants,
    },
  ]);

  const games = new MemoryGames();
  games.saved.push(storedGame);
  games.linked = [{ platform: "steam", platformId: "stand-in-id", playerId: "vatira" }];

  const service = new ManualGameService(
    options.source === false ? null : source,
    candidates,
    games,
  );

  return { games, service, source };
};

describe("ManualGameService.attach", () => {
  it("stores the replay as the chosen game with the chosen sides and resolves players", async () => {
    const { service, games } = setup();

    await expect(service.attach("t1", input)).resolves.toStrictEqual({
      blueGoals: 1,
      blueParticipantId: "p-bds",
      matchId: "m1",
      number: 2,
      orangeGoals: 3,
      orangeParticipantId: "p-kc",
      playedAt: PLAYED_AT.toISOString(),
      replays: [
        { ballchasingId: REPLAY, blueGoals: 1, orangeGoals: 3, playedAt: PLAYED_AT.toISOString() },
      ],
    });
    const [record] = added(games);
    expect(record?.number).toBe(2);
    expect(record?.replays).toMatchObject([
      { ballchasingId: REPLAY, playedAt: PLAYED_AT, rocketLeagueId: "RL-1" },
    ]);
    expect(
      record?.replays[0]?.players.map((player) => [player.name, player.playerId]),
    ).toStrictEqual([
      ["Seikoo", "seikoo"],
      ["Stand-in", "vatira"],
    ]);
    expect(record?.learnedLinks).toStrictEqual([
      { platform: "steam", platformId: "seikoo-id", playerId: "seikoo" },
    ]);
  });

  it("attaches a 1v1 replay by player and links each side to its player", async () => {
    const { service, games } = setup({
      participants: [
        {
          id: "p-stand-in",
          players: [{ id: "stand-in", name: "Stand-in" }],
          teamNames: ["Stand-in"],
        },
        { id: "p-seikoo", players: [{ id: "seikoo", name: "Seikoo" }], teamNames: ["Seikoo"] },
      ],
    });

    games.linked = [];

    await service.attach("t1", { ...input, blueParticipantId: "p-seikoo" });

    const [record] = added(games);
    expect(record).toMatchObject({
      blueParticipantId: "p-seikoo",
      orangeParticipantId: "p-stand-in",
    });
    expect(
      record?.replays[0]?.players.map((player) => [player.side, player.playerId]),
    ).toStrictEqual([
      ["blue", "seikoo"],
      ["orange", "stand-in"],
    ]);
  });

  it("accepts any game number from 1 when the format is unknown", async () => {
    const { service, games } = setup({ numberOfGames: null });

    await service.attach("t1", { ...input, gameNumber: 9 });

    expect(added(games)).toHaveLength(1);
  });

  it("rejects an unknown tournament before calling Ballchasing", async () => {
    const { service, source, games } = setup();

    await expect(rejection(service.attach("missing", input))).resolves.toBeInstanceOf(
      NotFoundError,
    );
    expect(source.statsCalls).toStrictEqual([]);
    expect(added(games)).toStrictEqual([]);
  });

  it.each([
    [
      "an invalid replay",
      "t1",
      { replay: "https://ballchasing.com/group/x" },
      InvalidInputError,
      "invalid_ballchasing_replay",
    ],
    [
      "a match of another tournament",
      "t1",
      { matchId: "m2" },
      InvalidInputError,
      "match_not_in_tournament",
    ],
    [
      "a team outside the match",
      "t1",
      { blueParticipantId: "p-vit" },
      InvalidInputError,
      "participant_not_in_match",
    ],
    ["game 0", "t1", { gameNumber: 0 }, InvalidInputError, "game_number_out_of_range"],
    [
      "a game past the format",
      "t1",
      { gameNumber: 6 },
      InvalidInputError,
      "game_number_out_of_range",
    ],
    ["a game number already taken", "t1", { gameNumber: 1 }, ConflictError, "game_number_taken"],
  ])("rejects %s before calling Ballchasing", async (_label, tournamentId, change, kind, code) => {
    const { service, source, games } = setup();

    const error = await rejection(service.attach(tournamentId, { ...input, ...change }));

    expect(error).toBeInstanceOf(kind);

    expect(error.detail.code).toBe(code);
    expect(source.statsCalls).toStrictEqual([]);
    expect(added(games)).toStrictEqual([]);
  });

  it("says where a replay is already attached", async () => {
    const { service, games, source } = setup();

    const attached: GameAttachment = {
      matchId: "m9",
      number: 3,
      teams: ["Vitality", "Falcons"],
      tournamentName: "RLCS Paris Major",
    };

    games.attachments.set(REPLAY, attached);

    const error = await rejection(service.attach("t1", input));

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.detail.code).toBe("replay_already_attached");
    expect(error.message).toContain("game 3 of Vitality vs Falcons in RLCS Paris Major");
    expect(source.statsCalls).toStrictEqual([]);
  });

  it("rejects a replay Ballchasing has not processed or that misses a team", async () => {
    const { service, games, source } = setup();
    source.outcomes.set(REPLAY, null);

    const notReady = await rejection(service.attach("t1", input));

    source.outcomes.set(REPLAY, {
      ...stats,
      players: stats.players.filter((player) => player.side === "blue"),
    });

    const oneSided = await rejection(service.attach("t1", input));

    expect(notReady).toBeInstanceOf(UnprocessableError);
    expect(notReady.detail.code).toBe("replay_not_ready");
    expect(oneSided.detail.code).toBe("player_mismatch");
    expect(added(games)).toStrictEqual([]);
  });

  it("explains a missing API key", async () => {
    const { service } = setup({ source: false });

    await expect(service.attach("t1", input)).rejects.toBeInstanceOf(IntegrationError);
  });
});

const at1 = { matchId: "m1", number: 1 };
const append = { blueParticipantId: "p-bds", replay: REPLAY };

describe("ManualGameService.appendReplay", () => {
  it("adds the replay after the game's last one in the game's orientation, with no score check", async () => {
    const { service, games } = setup();

    await expect(service.appendReplay("t1", at1, append)).resolves.toStrictEqual({
      ...storedSummary,
      blueGoals: 4,
      orangeGoals: 1,
      replays: [
        ...storedSummary.replays,
        { ballchasingId: REPLAY, blueGoals: 3, orangeGoals: 1, playedAt: PLAYED_AT.toISOString() },
      ],
    });

    const [game] = games.saved;
    expect(game?.replays[1]?.players.map((player) => [player.side, player.playerId])).toStrictEqual(
      [
        ["orange", "seikoo"],
        ["blue", "vatira"],
      ],
    );
    expect(games.linked).toContainEqual({
      platform: "steam",
      platformId: "seikoo-id",
      playerId: "seikoo",
    });
  });

  it("clears a staff exclusion of the replay", async () => {
    const { service, games } = setup();
    games.exclusions.add(REPLAY);

    await service.appendReplay("t1", at1, append);

    expect(games.exclusions.has(REPLAY)).toBe(false);
  });

  it.each([
    [
      "a game without stats",
      { matchId: "m1", number: 3 },
      {},
      NotFoundError,
      "match_game_not_found",
    ],
    [
      "a team outside the match",
      at1,
      { blueParticipantId: "p-vit" },
      InvalidInputError,
      "participant_not_in_match",
    ],
    [
      "an invalid replay",
      at1,
      { replay: "https://ballchasing.com/group/x" },
      InvalidInputError,
      "invalid_ballchasing_replay",
    ],
  ])("rejects %s before calling Ballchasing", async (_label, location, change, kind, code) => {
    const { service, source, games } = setup();

    const error = await rejection(service.appendReplay("t1", location, { ...append, ...change }));

    expect(error).toBeInstanceOf(kind);
    expect(error.detail.code).toBe(code);
    expect(source.statsCalls).toStrictEqual([]);
    expect(games.saved).toStrictEqual([storedGame]);
  });

  it("refuses a replay attached anywhere, or not processed", async () => {
    const { service, games, source } = setup();

    games.attachments.set(REPLAY, {
      matchId: "m9",
      number: 3,
      teams: ["Vitality", "Falcons"],
      tournamentName: "RLCS Paris Major",
    });

    const attached = await rejection(service.appendReplay("t1", at1, append));
    games.attachments.clear();
    source.outcomes.set(REPLAY, null);
    const notReady = await rejection(service.appendReplay("t1", at1, append));

    expect(attached.detail.code).toBe("replay_already_attached");
    expect(notReady.detail.code).toBe("replay_not_ready");
    expect(games.saved).toStrictEqual([storedGame]);
  });
});

describe("ManualGameService.removeReplay", () => {
  it("removes one replay of a split game and excludes it", async () => {
    const { service, games } = setup();
    await service.appendReplay("t1", at1, append);

    await expect(service.removeReplay("t1", at1, REPLAY)).resolves.toStrictEqual(storedSummary);
    expect(games.exclusions).toStrictEqual(new Set([REPLAY]));
  });

  it("refuses the game's only replay and a replay of another game", async () => {
    const { service, games } = setup();

    const only = await rejection(service.removeReplay("t1", at1, STORED));
    const other = await rejection(service.removeReplay("t1", at1, REPLAY));

    expect([only, other].map((error) => [error.constructor, error.detail.code])).toStrictEqual([
      [ConflictError, "last_game_replay"],
      [NotFoundError, "match_game_replay_not_found"],
    ]);
    expect(games.saved).toStrictEqual([storedGame]);
    expect(games.exclusions).toStrictEqual(new Set());
  });
});

describe("ManualGameService.remove", () => {
  it("removes the game and returns it", async () => {
    const { service, games } = setup();

    await expect(service.remove("t1", "m1", 1)).resolves.toStrictEqual(storedSummary);
    expect(games.saved).toStrictEqual([]);
    expect(games.exclusions).toStrictEqual(new Set([STORED]));
  });

  it("reports a missing game or tournament", async () => {
    const { service, games } = setup();

    await expect(service.remove("t1", "m1", 4)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove("missing", "m1", 1)).rejects.toBeInstanceOf(NotFoundError);
    expect(games.saved).toStrictEqual([storedGame]);
  });
});

describe("ManualGameService.list", () => {
  it("lists games only for a known tournament", async () => {
    const { service } = setup();

    await expect(service.list("t1")).resolves.toStrictEqual([storedSummary]);
    await expect(service.list("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
