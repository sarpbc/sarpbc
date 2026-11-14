import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  IntegrationError,
  InvalidInputError,
  NotFoundError,
  UnprocessableError,
} from "../../common/domain/errors";
import type { CandidateMatch } from "../domain/replay-matching";
import { ManualGameService } from "./manual-game.service";
import type {
  BallchasingSource,
  GameAttachment,
  GameRecord,
  GameStatsStore,
  ReplayStats,
  StatsCandidates,
} from "./ports";

const REPLAY = "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const PLAYED_AT = new Date("2026-06-01T18:05:00Z");

const match: CandidateMatch = {
  id: "m1",
  beginAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  finished: true,
  numberOfGames: 5,
  participants: [
    { id: "p-kc", teamNames: ["Karmine Corp"], players: [{ id: "vatira", name: "Vatira" }] },
    { id: "p-bds", teamNames: ["BDS"], players: [{ id: "seikoo", name: "Seikoo" }] },
  ],
  scores: new Map(),
  storedReplayIds: ["stored-1"],
};

const stats: ReplayStats = {
  rocketLeagueId: "RL-1",
  playedAt: PLAYED_AT,
  blueGoals: 1,
  orangeGoals: 3,
  players: [
    { ...line("Seikoo", "seikoo-id"), side: "blue" },
    { ...line("Stand-in", "stand-in-id"), side: "orange" },
  ],
};

function line(name: string, platformId: string) {
  return {
    name,
    platform: "steam",
    platformId,
    goals: 1,
    assists: 0,
    saves: 2,
    shots: 3,
    demolitions: 0,
  };
}

const input = {
  matchId: "m1",
  replay: `https://ballchasing.com/replay/${REPLAY}`,
  gameNumber: 2,
  blueParticipantId: "p-bds",
};

function setup(
  options: {
    source?: boolean;
    numberOfGames?: number | null;
    participants?: CandidateMatch["participants"];
  } = {},
) {
  const source = {
    groupReplays: vi.fn<BallchasingSource["groupReplays"]>(),
    replayStats: vi.fn<BallchasingSource["replayStats"]>(async () => stats),
  } satisfies BallchasingSource;

  const candidates: StatsCandidates = {
    tournamentExists: vi.fn(async (id: string) => id === "t1"),
    matches: vi.fn(async () => [
      {
        ...match,
        numberOfGames: options.numberOfGames === undefined ? 5 : options.numberOfGames,
        participants: options.participants ?? match.participants,
      },
    ]),
  };

  const games = {
    locations: vi.fn<GameStatsStore["locations"]>(
      async () => new Map([["stored-1", { matchId: "m1", number: 1 }]]),
    ),
    excluded: vi.fn<GameStatsStore["excluded"]>(async () => new Set()),
    attachment: vi.fn<GameStatsStore["attachment"]>(async () => null),
    links: vi.fn<GameStatsStore["links"]>(async () => [
      { platform: "steam", platformId: "stand-in-id", playerId: "vatira" },
    ]),
    save: vi.fn<GameStatsStore["save"]>(async (record) => ({
      matchId: record.matchId,
      number: record.number,
      ballchasingId: record.ballchasingId,
      playedAt: record.playedAt?.toISOString() ?? null,
      blueParticipantId: record.blueParticipantId,
      orangeParticipantId: record.orangeParticipantId,
      blueGoals: record.blueGoals,
      orangeGoals: record.orangeGoals,
    })),
    byMatch: vi.fn<GameStatsStore["byMatch"]>(async () => []),
    inTournament: vi.fn<GameStatsStore["inTournament"]>(async () => []),
    playerLines: vi.fn<GameStatsStore["playerLines"]>(async () => []),
    remove: vi.fn<GameStatsStore["remove"]>(async () => null),
  } satisfies GameStatsStore;

  const service = new ManualGameService(
    options.source === false ? null : source,
    candidates,
    games,
  );

  return { service, source, games };
}

describe("ManualGameService.attach", () => {
  it("stores the replay as the chosen game with the chosen sides and resolves players", async () => {
    const { service, games, source } = setup();

    expect(await service.attach("t1", input)).toEqual({
      matchId: "m1",
      number: 2,
      ballchasingId: REPLAY,
      playedAt: PLAYED_AT.toISOString(),
      blueParticipantId: "p-bds",
      orangeParticipantId: "p-kc",
      blueGoals: 1,
      orangeGoals: 3,
    });
    expect(source.replayStats).toHaveBeenCalledWith(REPLAY);
    const record = games.save.mock.calls[0][0] as GameRecord;
    expect(record).toMatchObject({ rocketLeagueId: "RL-1", playedAt: PLAYED_AT, number: 2 });
    expect(record.players.map((player) => [player.name, player.playerId])).toEqual([
      ["Seikoo", "seikoo"],
      ["Stand-in", "vatira"],
    ]);
    expect(record.learnedLinks).toEqual([
      { platform: "steam", platformId: "seikoo-id", playerId: "seikoo" },
    ]);
  });

  it("attaches a 1v1 replay by player and links each side to its player", async () => {
    const { service, games } = setup({
      participants: [
        {
          id: "p-stand-in",
          teamNames: ["Stand-in"],
          players: [{ id: "stand-in", name: "Stand-in" }],
        },
        { id: "p-seikoo", teamNames: ["Seikoo"], players: [{ id: "seikoo", name: "Seikoo" }] },
      ],
    });

    games.links.mockResolvedValue([]);

    await service.attach("t1", { ...input, blueParticipantId: "p-seikoo" });

    const [record] = games.save.mock.calls[0];
    expect(record).toMatchObject({
      blueParticipantId: "p-seikoo",
      orangeParticipantId: "p-stand-in",
    });
    expect(record.players.map((player) => [player.side, player.playerId])).toEqual([
      ["blue", "seikoo"],
      ["orange", "stand-in"],
    ]);
  });

  it("accepts any game number from 1 when the format is unknown", async () => {
    const { service, games } = setup({ numberOfGames: null });

    await service.attach("t1", { ...input, gameNumber: 9 });

    expect(games.save).toHaveBeenCalledOnce();
  });

  it.each([
    ["an unknown tournament", "missing", {}, NotFoundError, undefined],
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

    const error = await service.attach(tournamentId, { ...input, ...change }).catch((e) => e);

    expect(error).toBeInstanceOf(kind);

    if (code) expect(error.detail.code).toBe(code);
    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.save).not.toHaveBeenCalled();
  });

  it("says where a replay is already attached", async () => {
    const { service, games, source } = setup();

    const attached: GameAttachment = {
      matchId: "m9",
      number: 3,
      tournamentName: "RLCS Paris Major",
      teams: ["Vitality", "Falcons"],
    };

    games.attachment.mockResolvedValueOnce(attached);

    const error = await service.attach("t1", input).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.detail.code).toBe("replay_already_attached");
    expect(error.message).toContain("game 3 of Vitality vs Falcons in RLCS Paris Major");
    expect(source.replayStats).not.toHaveBeenCalled();
  });

  it("rejects a replay Ballchasing has not processed or that misses a team", async () => {
    const { service, games, source } = setup();
    source.replayStats.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...stats,
      players: stats.players.filter((player) => player.side === "blue"),
    });

    const notReady = await service.attach("t1", input).catch((e) => e);
    const oneSided = await service.attach("t1", input).catch((e) => e);

    expect(notReady).toBeInstanceOf(UnprocessableError);
    expect(notReady.detail.code).toBe("replay_not_ready");
    expect(oneSided.detail.code).toBe("player_mismatch");
    expect(games.save).not.toHaveBeenCalled();
  });

  it("explains a missing API key", async () => {
    const { service } = setup({ source: false });

    await expect(service.attach("t1", input)).rejects.toBeInstanceOf(IntegrationError);
  });
});

describe("ManualGameService.remove", () => {
  it("removes the game and returns it", async () => {
    const { service, games } = setup();

    const removed = {
      matchId: "m1",
      number: 1,
      ballchasingId: "stored-1",
      playedAt: null,
      blueParticipantId: "p-kc",
      orangeParticipantId: "p-bds",
      blueGoals: 1,
      orangeGoals: 0,
    };

    games.remove.mockResolvedValueOnce(removed);

    expect(await service.remove("t1", "m1", 1)).toEqual(removed);
    expect(games.remove).toHaveBeenCalledWith("t1", { matchId: "m1", number: 1 });
  });

  it("reports a missing game or tournament", async () => {
    const { service, games } = setup();

    await expect(service.remove("t1", "m1", 4)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove("missing", "m1", 1)).rejects.toBeInstanceOf(NotFoundError);
    expect(games.remove).toHaveBeenCalledOnce();
  });
});

describe("ManualGameService.list", () => {
  it("lists the tournament's stored games", async () => {
    const { service, games } = setup();

    expect(await service.list("t1")).toEqual([]);
    expect(games.inTournament).toHaveBeenCalledWith("t1");
    await expect(service.list("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
