import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import { Match, matchPublicSlug } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import type { MatchWriter } from "../ports";
import {
  createEmptyBracketInTransaction,
  createMatchInTransaction,
  setGameVodsInTransaction,
  setVodsInTransaction,
  setWinnerInTransaction,
  updateMatchInTransaction,
  upsertSyncedMatchInTransaction,
} from "./write-match";

const matchWriterMock = () =>
  ({
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
    timings: vi.fn(),
    references: vi.fn(),
    remove: vi.fn(),
    bracket: vi.fn(),
  }) satisfies MatchWriter;

describe("Match writes", () => {
  const tournament = Object.assign(new Tournament(), { id: "cup" });

  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      tournamentId: tournament.id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );

  const writer = matchWriterMock();

  beforeEach(() => {
    vi.resetAllMocks();
    writer.tournament.mockResolvedValue(tournament);
    writer.participants.mockResolvedValue(participants);
    writer.byPandascoreId.mockResolvedValue(null);
  });

  it("derives a finished match winner from scores", async () => {
    const match = await createMatchInTransaction(writer, tournament.id, {
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

  it("keeps the first end date of a finished match synced without one", async () => {
    const endAt = new Date("2026-11-02T19:12:00Z");
    writer.byPandascoreId.mockResolvedValue(
      Object.assign(new Match(), { tournament, pandascoreId: 7, status: "finished", endAt }),
    );

    const match = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      name: "Final",
      participantIds: ["a", "b"],
      pandascoreId: 7,
      status: "finished",
    });

    expect(match.endAt).toEqual(endAt);
  });

  it("rejects participants belonging to another tournament", async () => {
    await expect(
      createMatchInTransaction(writer, tournament.id, {
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

    const updated = await upsertSyncedMatchInTransaction(writer, tournament.id, {
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
    expect(match.endAt).toBeInstanceOf(Date);
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

  const writer = matchWriterMock();

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

  it("ends a match finished without an end date at the time of the update", async () => {
    writer.load.mockResolvedValue(
      Object.assign(manualMatch(), { status: "running", winner: null }),
    );
    const before = new Date();
    const match = await updateMatchInTransaction(writer, "match", { status: "finished" });
    expect(match.endAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("keeps the end date staff send with a finished status", async () => {
    writer.load.mockResolvedValue(
      Object.assign(manualMatch(), { status: "running", winner: null }),
    );
    const endAt = new Date("2026-11-02T19:12:00Z");
    const match = await updateMatchInTransaction(writer, "match", { status: "finished", endAt });
    expect(match.endAt).toEqual(endAt);
  });

  it("clears the end date when the match is reopened", async () => {
    writer.load.mockResolvedValue(Object.assign(manualMatch(), { endAt: new Date() }));
    const match = await updateMatchInTransaction(writer, "match", { status: "running" });
    expect(match.endAt).toBeNull();
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

describe("Match VOD writes", () => {
  const writer = matchWriterMock();

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

    const match = await upsertSyncedMatchInTransaction(writer, "cup", {
      name: "Final",
      participantIds: [],
      pandascoreId: 42,
      numberOfGames: 7,
    });

    expect(match.vods).toHaveLength(2);
  });
});

describe("Match writes between player participants", () => {
  const knockout = Object.assign(new Tournament(), {
    id: "knockout",
    format: "1v1",
    slug: "fake-knockout",
    event: { id: "event", slug: "fake-knockout", name: "Fake Knockout" },
  });

  const solo = (id: string, name: string) =>
    Object.assign(new TournamentParticipant(), {
      id,
      tournamentId: knockout.id,
      team: null,
      players: [
        Object.assign(new Player(), { id: `player-${id}`, name, slug: name.toLowerCase() }),
      ],
    });

  const players = [solo("zen", "Zen"), solo("vatira", "Vatira")];
  const writer = matchWriterMock();

  beforeEach(() => {
    vi.resetAllMocks();
    writer.tournament.mockResolvedValue(knockout);
    writer.participants.mockResolvedValue(players);
  });

  it("writes a 1v1 match, its scores and its winner", async () => {
    const match = await createMatchInTransaction(writer, knockout.id, {
      name: "Final",
      participantIds: ["zen", "vatira"],
      status: "finished",
      results: [
        { participantId: "zen", score: 3 },
        { participantId: "vatira", score: 1 },
      ],
    });

    expect(match.participants.every((participant) => participant.team === null)).toBe(true);
    expect(match.winner?.id).toBe("zen");
    expect(matchPublicSlug(match)).toBe("vatira-vs-zen-fake-knockout");
  });

  it("corrects the score of a 1v1 match and moves the winner", async () => {
    writer.load.mockResolvedValue(
      Object.assign(new Match(), {
        id: "final",
        tournament: knockout,
        participants: players,
        status: "finished",
        winner: players[0],
      }),
    );

    const match = await updateMatchInTransaction(writer, "final", {
      results: [
        { participantId: "zen", score: 2 },
        { participantId: "vatira", score: 3 },
      ],
    });

    expect(match.winner?.id).toBe("vatira");
    expect(match.results.map((result) => result.score)).toEqual([2, 3]);
  });
});

describe("Manual bracket writes", () => {
  const stage = Object.assign(new Tournament(), { id: "finals", source: "manual" });

  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      tournamentId: stage.id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );

  const writer = matchWriterMock();

  const semis = [
    { previousMatchId: "semi-1", type: "winner" },
    { previousMatchId: "semi-2", type: "winner" },
  ] as const;

  const emptyMatch = (overrides: Partial<Match> = {}) =>
    Object.assign(new Match(), { id: "final", tournament: stage, ...overrides });

  beforeEach(() => {
    vi.resetAllMocks();
    writer.tournament.mockResolvedValue(stage);
    writer.participants.mockResolvedValue(participants);
    writer.bracket.mockResolvedValue({
      hasBracket: true,
      matches: [
        { id: "semi-1", previousMatches: [] },
        { id: "semi-2", previousMatches: [] },
        { id: "final", previousMatches: [] },
      ],
    });
  });

  it("creates a final fed by the winners of both semifinals", async () => {
    const match = await createMatchInTransaction(writer, stage.id, {
      name: "Grand Final",
      participantIds: ["a", "b"],
      previousMatches: [...semis],
    });

    expect(
      match.previousMatches.map(({ previousMatch, type }) => [previousMatch.id, type]),
    ).toEqual([
      ["semi-1", "winner"],
      ["semi-2", "winner"],
    ]);
    expect(writer.bracket).toHaveBeenCalledWith(stage.id);
    expect(writer.save).toHaveBeenCalledWith(match);
  });

  it("refuses a previous match of another stage", async () => {
    writer.load.mockResolvedValue(emptyMatch());
    await expect(
      updateMatchInTransaction(writer, "final", {
        previousMatches: [{ previousMatchId: "other-stage", type: "winner" }],
      }),
    ).rejects.toThrow(/same stage/);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("refuses links that would close a cycle", async () => {
    writer.bracket.mockResolvedValue({
      hasBracket: true,
      matches: [
        { id: "semi-1", previousMatches: [] },
        { id: "semi-2", previousMatches: [] },
        { id: "final", previousMatches: [...semis] },
      ],
    });
    writer.load.mockResolvedValue(emptyMatch({ id: "semi-1" }));
    await expect(
      updateMatchInTransaction(writer, "semi-1", {
        previousMatches: [{ previousMatchId: "final", type: "winner" }],
      }),
    ).rejects.toThrow(/cycle/);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("replaces and clears the links of a manual match", async () => {
    writer.load.mockResolvedValue(emptyMatch());

    const linked = await updateMatchInTransaction(writer, "final", {
      previousMatches: [...semis],
    });

    expect(linked.previousMatches).toHaveLength(2);
    writer.load.mockResolvedValue(linked);
    const cleared = await updateMatchInTransaction(writer, "final", { previousMatches: [] });
    expect(cleared.previousMatches).toEqual([]);
  });

  it("refuses bracket links and participants on a PandaScore match", async () => {
    const synced = emptyMatch({ pandascoreId: 42, source: "pandascore" });
    writer.load.mockResolvedValue(synced);
    await expect(
      updateMatchInTransaction(writer, "final", { previousMatches: [...semis] }),
    ).rejects.toThrow(/PandaScore/);
    await expect(
      updateMatchInTransaction(writer, "final", { participantIds: ["a", "b"] }),
    ).rejects.toThrow(/PandaScore/);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("refuses bracket links on a new match of a PandaScore stage", async () => {
    writer.tournament.mockResolvedValue(
      Object.assign(new Tournament(), { id: "synced", source: "pandascore", pandascoreId: 7 }),
    );
    await expect(
      createMatchInTransaction(writer, "synced", {
        name: "Grand Final",
        participantIds: ["a", "b"],
        previousMatches: [...semis],
      }),
    ).rejects.toThrow(/PandaScore/);
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("fills an empty bracket match with its participants in order", async () => {
    writer.load.mockResolvedValue(emptyMatch());
    const match = await updateMatchInTransaction(writer, "final", { participantIds: ["b", "a"] });
    expect(match.participants.map((participant) => participant.id)).toEqual(["b", "a"]);
  });

  it("refuses to swap the participants of a scored match without new scores", async () => {
    writer.load.mockResolvedValue(
      emptyMatch({
        participants: [participants[0]].flatMap((participant) => participant ?? []),
        results: [{ id: "r", match: { id: "final" }, participant: { id: "a" }, score: 2 }],
      }),
    );
    await expect(
      updateMatchInTransaction(writer, "final", { participantIds: ["b"] }),
    ).rejects.toThrow(/scores/);
  });

  it("generates an empty four-team bracket", async () => {
    writer.bracket.mockResolvedValue({ hasBracket: true, matches: [] });

    const matches = await createEmptyBracketInTransaction(writer, stage.id, {
      teams: 4,
      numberOfGames: 7,
    });

    const [semi1, semi2, final] = matches;
    expect(matches.map((match) => [match.name, match.participants.length])).toEqual([
      ["Semifinal 1", 0],
      ["Semifinal 2", 0],
      ["Grand Final", 0],
    ]);
    expect(final?.previousMatches.map(({ previousMatch }) => previousMatch.id)).toEqual([
      semi1?.id,
      semi2?.id,
    ]);
    expect(matches.every((match) => match.numberOfGames === 7 && match.source === "manual")).toBe(
      true,
    );
    expect(writer.save).toHaveBeenCalledTimes(3);
  });

  it("generates an empty bracket only on a manual bracket stage without matches", async () => {
    writer.bracket.mockResolvedValue({ hasBracket: false, matches: [] });
    await expect(createEmptyBracketInTransaction(writer, stage.id, { teams: 4 })).rejects.toThrow(
      /Enable the bracket/,
    );
    writer.bracket.mockResolvedValue({
      hasBracket: true,
      matches: [{ id: "existing", previousMatches: [] }],
    });
    await expect(createEmptyBracketInTransaction(writer, stage.id, { teams: 8 })).rejects.toThrow(
      /already has matches/,
    );
    writer.tournament.mockResolvedValue(
      Object.assign(new Tournament(), { id: "synced", source: "pandascore", pandascoreId: 7 }),
    );
    await expect(createEmptyBracketInTransaction(writer, "synced", { teams: 4 })).rejects.toThrow(
      /PandaScore/,
    );
    expect(writer.save).not.toHaveBeenCalled();
  });
});
