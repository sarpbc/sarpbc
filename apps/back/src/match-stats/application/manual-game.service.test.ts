import { describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../../common/domain/errors/application-error";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import type { CandidateMatch } from "../domain/replay-matching";
import { ManualGameService } from "./manual-game.service";
import type {
  BallchasingSource,
  GameAttachment,
  GameStatsStore,
  ReplayStats,
  StatsCandidates,
} from "./ports";

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
  storedReplayIds: ["stored-1"],
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

const rejection = async (work: Promise<unknown>): Promise<ApplicationError> => {
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

const setup = (
  options: {
    source?: boolean;
    numberOfGames?: number | null;
    participants?: CandidateMatch["participants"];
  } = {},
) => {
  const source = {
    groupReplays: vi.fn<BallchasingSource["groupReplays"]>(),
    replayStats: vi.fn<BallchasingSource["replayStats"]>(async () => stats),
  } satisfies BallchasingSource;

  const candidates: StatsCandidates = {
    matches: vi.fn<StatsCandidates["matches"]>(async () => [
      {
        ...match,
        numberOfGames: options.numberOfGames === undefined ? 5 : options.numberOfGames,
        participants: options.participants ?? match.participants,
      },
    ]),
    tournamentExists: vi.fn<StatsCandidates["tournamentExists"]>(async (id) => id === "t1"),
  };

  const games = {
    attachment: vi.fn<GameStatsStore["attachment"]>(async () => null),
    byMatch: vi.fn<GameStatsStore["byMatch"]>(async () => []),
    excluded: vi.fn<GameStatsStore["excluded"]>(async () => new Set()),
    inTournament: vi.fn<GameStatsStore["inTournament"]>(async () => []),
    links: vi.fn<GameStatsStore["links"]>(async () => [
      { platform: "steam", platformId: "stand-in-id", playerId: "vatira" },
    ]),
    locations: vi.fn<GameStatsStore["locations"]>(
      async () => new Map([["stored-1", { matchId: "m1", number: 1 }]]),
    ),
    playerLines: vi.fn<GameStatsStore["playerLines"]>(async () => []),
    remove: vi.fn<GameStatsStore["remove"]>(async () => null),
    save: vi.fn<GameStatsStore["save"]>(async (record) => ({
      ballchasingId: record.ballchasingId,
      blueGoals: record.blueGoals,
      blueParticipantId: record.blueParticipantId,
      matchId: record.matchId,
      number: record.number,
      orangeGoals: record.orangeGoals,
      orangeParticipantId: record.orangeParticipantId,
      playedAt: record.playedAt?.toISOString() ?? null,
    })),
  } satisfies GameStatsStore;

  const service = new ManualGameService(
    options.source === false ? null : source,
    candidates,
    games,
  );

  return { games, service, source };
};

describe("ManualGameService.attach", () => {
  it("stores the replay as the chosen game with the chosen sides and resolves players", async () => {
    const { service, games, source } = setup();

    await expect(service.attach("t1", input)).resolves.toStrictEqual({
      ballchasingId: REPLAY,
      blueGoals: 1,
      blueParticipantId: "p-bds",
      matchId: "m1",
      number: 2,
      orangeGoals: 3,
      orangeParticipantId: "p-kc",
      playedAt: PLAYED_AT.toISOString(),
    });
    expect(source.replayStats).toHaveBeenCalledWith(REPLAY);
    const [[record]] = games.save.mock.calls;
    expect(record).toMatchObject({ number: 2, playedAt: PLAYED_AT, rocketLeagueId: "RL-1" });
    expect(record.players.map((player) => [player.name, player.playerId])).toStrictEqual([
      ["Seikoo", "seikoo"],
      ["Stand-in", "vatira"],
    ]);
    expect(record.learnedLinks).toStrictEqual([
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

    games.links.mockResolvedValue([]);

    await service.attach("t1", { ...input, blueParticipantId: "p-seikoo" });

    const [[record]] = games.save.mock.calls;
    expect(record).toMatchObject({
      blueParticipantId: "p-seikoo",
      orangeParticipantId: "p-stand-in",
    });
    expect(record.players.map((player) => [player.side, player.playerId])).toStrictEqual([
      ["blue", "seikoo"],
      ["orange", "stand-in"],
    ]);
  });

  it("accepts any game number from 1 when the format is unknown", async () => {
    const { service, games } = setup({ numberOfGames: null });

    await service.attach("t1", { ...input, gameNumber: 9 });

    expect(games.save).toHaveBeenCalledOnce();
  });

  it("rejects an unknown tournament before calling Ballchasing", async () => {
    const { service, source, games } = setup();

    await expect(rejection(service.attach("missing", input))).resolves.toBeInstanceOf(
      NotFoundError,
    );
    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.save).not.toHaveBeenCalled();
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
    expect(source.replayStats).not.toHaveBeenCalled();
    expect(games.save).not.toHaveBeenCalled();
  });

  it("says where a replay is already attached", async () => {
    const { service, games, source } = setup();

    const attached: GameAttachment = {
      matchId: "m9",
      number: 3,
      teams: ["Vitality", "Falcons"],
      tournamentName: "RLCS Paris Major",
    };

    games.attachment.mockResolvedValueOnce(attached);

    const error = await rejection(service.attach("t1", input));

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

    const notReady = await rejection(service.attach("t1", input));
    const oneSided = await rejection(service.attach("t1", input));

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
      ballchasingId: "stored-1",
      blueGoals: 1,
      blueParticipantId: "p-kc",
      matchId: "m1",
      number: 1,
      orangeGoals: 0,
      orangeParticipantId: "p-bds",
      playedAt: null,
    };

    games.remove.mockResolvedValueOnce(removed);

    await expect(service.remove("t1", "m1", 1)).resolves.toStrictEqual(removed);
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

    await expect(service.list("t1")).resolves.toStrictEqual([]);
    expect(games.inTournament).toHaveBeenCalledWith("t1");
    await expect(service.list("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
