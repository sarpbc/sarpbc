import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Team } from "../../../roster/domain/roster";
import { Match, Tournament, TournamentParticipant } from "../../domain/competition";
import type { MatchWriter } from "../ports";
import {
  setGameVodsInTransaction,
  setVodsInTransaction,
  setWinnerInTransaction,
  updateMatchInTransaction,
  upsertMatchInTransaction,
} from "./write-match";

describe("Match writes", () => {
  const tournament = Object.assign(new Tournament(), { id: "cup" });
  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      tournamentId: tournament.id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );
  const writer = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
    timings: vi.fn(),
  } satisfies MatchWriter;

  beforeEach(() => {
    vi.resetAllMocks();
    writer.tournament.mockResolvedValue(tournament);
    writer.participants.mockResolvedValue(participants);
    writer.byPandascoreId.mockResolvedValue(null);
  });

  it("derives a finished match winner from scores", async () => {
    const match = await upsertMatchInTransaction(writer, tournament.id, {
      name: "Final",
      participantIds: ["a", "b"],
      status: "finished",
      results: [
        { participantId: "a", score: 4 },
        { participantId: "b", score: 2 },
      ],
    });
    expect(match.winner?.id).toBe("a");
    expect(match.results.map((result) => result.score)).toEqual([4, 2]);
    expect(writer.save).toHaveBeenCalledWith(match);
  });

  it("rejects participants belonging to another tournament", async () => {
    await expect(
      upsertMatchInTransaction(writer, tournament.id, {
        name: "Final",
        participantIds: ["a", "outsider"],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("preserves omitted streams when refreshing a match", async () => {
    const match = Object.assign(new Match(), {
      id: "match",
      tournament,
      officialStreams: [{ language: "en", url: "https://twitch.tv/rocketleague", main: true }],
    });
    writer.byPandascoreId.mockResolvedValue(match);
    const updated = await upsertMatchInTransaction(writer, tournament.id, {
      name: "Final",
      pandascoreId: 123,
      participantIds: ["a", "b"],
    });
    expect(updated.officialStreams).toEqual([
      { language: "en", url: "https://twitch.tv/rocketleague", main: true },
    ]);
  });

  it("rejects a manually selected winner outside the match", async () => {
    writer.load.mockResolvedValue(Object.assign(new Match(), { participants }));
    await expect(setWinnerInTransaction(writer, "match", "outsider")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("finishes a match when a participant is selected as winner", async () => {
    writer.load.mockResolvedValue(Object.assign(new Match(), { participants }));
    const match = await setWinnerInTransaction(writer, "match", "b");
    expect(match).toMatchObject({ status: "finished", winner: { id: "b" } });
    expect(writer.save).toHaveBeenCalledWith(match);
  });
});

describe("Manual match corrections", () => {
  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );
  const writer = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
    timings: vi.fn(),
  } satisfies MatchWriter;
  const manualMatch = () =>
    Object.assign(new Match(), {
      id: "match",
      participants,
      status: "finished",
      winner: participants[0],
    });

  beforeEach(() => vi.resetAllMocks());

  it("replaces scores and re-derives the winner of a finished match", async () => {
    writer.load.mockResolvedValue(manualMatch());
    const match = await updateMatchInTransaction(writer, "match", {
      results: [
        { participantId: "a", score: 1 },
        { participantId: "b", score: 3 },
      ],
    });
    expect(match.winner?.id).toBe("b");
    expect(match.results.map((result) => [result.participant.id, result.score])).toEqual([
      ["a", 1],
      ["b", 3],
    ]);
    expect(writer.save).toHaveBeenCalledWith(match);
  });

  it("clears the winner when the match is reopened", async () => {
    writer.load.mockResolvedValue(manualMatch());
    const match = await updateMatchInTransaction(writer, "match", { status: "running" });
    expect(match).toMatchObject({ status: "running", winner: null });
  });

  it("keeps a reopened match running even when scores are sent", async () => {
    writer.load.mockResolvedValue(Object.assign(manualMatch(), { endAt: new Date() }));
    const match = await updateMatchInTransaction(writer, "match", {
      status: "running",
      results: [
        { participantId: "a", score: 1 },
        { participantId: "b", score: 3 },
      ],
    });
    expect(match).toMatchObject({ status: "running", winner: null });
  });

  it("derives the winner from stored scores when finishing a match", async () => {
    writer.load.mockResolvedValue(
      Object.assign(manualMatch(), {
        status: "running",
        winner: null,
        results: [
          { id: "r1", match: { id: "match" }, participant: { id: "a" }, score: 2 },
          { id: "r2", match: { id: "match" }, participant: { id: "b" }, score: 4 },
        ],
      }),
    );
    const match = await updateMatchInTransaction(writer, "match", { status: "finished" });
    expect(match).toMatchObject({ status: "finished", winner: { id: "b" } });
  });

  it("refuses PandaScore-synced matches", async () => {
    writer.load.mockResolvedValue(Object.assign(manualMatch(), { pandascoreId: 99 }));
    await expect(
      updateMatchInTransaction(writer, "match", { status: "running" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("rejects scores for teams outside the match", async () => {
    writer.load.mockResolvedValue(manualMatch());
    await expect(
      updateMatchInTransaction(writer, "match", {
        results: [
          { participantId: "a", score: 3 },
          { participantId: "outsider", score: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });
});

describe("Match VOD writes", () => {
  const writer = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
    timings: vi.fn(),
  } satisfies MatchWriter;
  const syncedMatch = () =>
    Object.assign(new Match(), {
      id: "match",
      pandascoreId: 42,
      source: "pandascore",
      numberOfGames: 7,
      vods: [
        { game: 1, url: "https://youtu.be/g1", language: "en", source: "youtube" },
        { game: 5, url: "https://youtu.be/g5", language: "en", source: "youtube" },
      ],
    });

  beforeEach(() => vi.resetAllMocks());

  it("replaces every VOD link, including on a PandaScore match", async () => {
    writer.load.mockResolvedValue(syncedMatch());
    const match = await setVodsInTransaction(writer, "match", [
      { game: 7, url: "https://www.twitch.tv/videos/1?t=2h", language: "FR" },
    ]);
    expect(match.vods).toEqual([
      { game: 7, url: "https://www.twitch.tv/videos/1?t=2h", language: "fr", source: "twitch" },
    ]);
    expect(writer.save).toHaveBeenCalledWith(match);
  });

  it("replaces the links of one game and keeps the others", async () => {
    writer.load.mockResolvedValue(syncedMatch());
    const match = await setGameVodsInTransaction(writer, "match", 5, [
      { url: "https://youtu.be/g5?t=95", language: "de" },
      { url: "https://twitch.tv/videos/5", language: "en", source: "twitch" },
    ]);
    expect(match.vods.map((vod) => [vod.game, vod.source, vod.language])).toEqual([
      [1, "youtube", "en"],
      [5, "youtube", "de"],
      [5, "twitch", "en"],
    ]);
  });

  it("rejects invalid links without saving", async () => {
    writer.load.mockResolvedValue(syncedMatch());
    await expect(
      setGameVodsInTransaction(writer, "match", 8, [{ url: "https://youtu.be/x", language: "en" }]),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      setVodsInTransaction(writer, "match", [
        { game: 1, url: "https://youtu.be/x", language: "en", source: "twitch" },
      ]),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("reports a missing match", async () => {
    writer.load.mockResolvedValue(null);
    await expect(setVodsInTransaction(writer, "missing", [])).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps staff VOD links when PandaScore re-syncs the match", async () => {
    const tournament = Object.assign(new Tournament(), { id: "cup", source: "pandascore" });
    writer.tournament.mockResolvedValue(tournament);
    writer.participants.mockResolvedValue([]);
    writer.byPandascoreId.mockResolvedValue(syncedMatch());
    const match = await upsertMatchInTransaction(writer, "cup", {
      name: "Final",
      participantIds: [],
      pandascoreId: 42,
      numberOfGames: 7,
    });
    expect(match.vods).toHaveLength(2);
  });
});
