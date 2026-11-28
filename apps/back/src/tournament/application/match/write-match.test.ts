import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { Team } from "../../../roster/domain/team";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { memoryMatchWriter } from "../ports.test-utils";
import {
  createEmptyBracketInTransaction,
  createMatchInTransaction,
  setGameVodsInTransaction,
  setForfeitInTransaction,
  setVodsInTransaction,
  setWinnerInTransaction,
  updateMatchInTransaction,
  upsertSyncedMatchInTransaction,
} from "./write-match";

describe("Match writes", () => {
  const tournament = Object.assign(new Tournament(), { id: "cup" });

  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
      tournamentId: tournament.id,
    }),
  );

  let writer = memoryMatchWriter();

  beforeEach(() => {
    writer = memoryMatchWriter();
    writer.summaries.set(tournament.id, tournament);
    writer.participantsByTournament.set(tournament.id, participants);
  });

  it("derives a finished match winner from scores", async () => {
    const match = await createMatchInTransaction(writer, tournament.id, {
      name: "Final",
      participantIds: ["a", "b"],
      results: [
        { participantId: "a", score: 4 },
        { participantId: "b", score: 2 },
      ],
      status: "finished",
    });

    expect(match.winner?.id).toBe("a");
    expect(match.results.map((result) => result.score)).toStrictEqual([4, 2]);
    expect(writer.savedMatches).toContain(match);
  });

  it("keeps the first end date of a finished match synced without one", async () => {
    const endAt = new Date("2026-11-02T19:12:00Z");

    const existing = Object.assign(new Match(), {
      endAt,
      pandascoreId: 7,
      status: "finished",
      tournament,
    });

    writer.matches.set(existing.id, existing);

    const match = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      forfeitWinnerId: null,
      name: "Final",
      pandascoreId: 7,
      participantIds: ["a", "b"],
      status: "finished",
    });

    expect(match.endAt).toStrictEqual(endAt);
  });

  it("rejects participants belonging to another tournament", async () => {
    await expect(
      createMatchInTransaction(writer, tournament.id, {
        name: "Final",
        participantIds: ["a", "outsider"],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("preserves omitted streams when refreshing a match", async () => {
    const match = Object.assign(new Match(), {
      id: "match",
      officialStreams: [{ language: "en", main: true, url: "https://twitch.tv/rocketleague" }],
      pandascoreId: 123,
      tournament,
    });

    writer.matches.set(match.id, match);

    const updated = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      forfeitWinnerId: null,
      name: "Final",
      pandascoreId: 123,
      participantIds: ["a", "b"],
    });

    expect(updated.officialStreams).toStrictEqual([
      { language: "en", main: true, url: "https://twitch.tv/rocketleague" },
    ]);
  });

  it("rejects a manually selected winner outside the match", async () => {
    writer.matches.set("match", Object.assign(new Match(), { participants }));
    await expect(setWinnerInTransaction(writer, "match", "outsider")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("finishes a match when a participant is selected as winner", async () => {
    writer.matches.set("match", Object.assign(new Match(), { participants }));
    const match = await setWinnerInTransaction(writer, "match", "b");
    expect(match).toMatchObject({ status: "finished", winner: { id: "b" } });
    expect(match.endAt).toBeInstanceOf(Date);
    expect(writer.savedMatches).toContain(match);
  });
});

describe("Manual match corrections", () => {
  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
    }),
  );

  let writer = memoryMatchWriter();

  const manualMatch = () =>
    Object.assign(new Match(), {
      id: "match",
      participants,
      status: "finished",
      winner: participants[0],
    });

  beforeEach(() => {
    writer = memoryMatchWriter();
  });

  it("replaces scores and re-derives the winner of a finished match", async () => {
    writer.matches.set("match", manualMatch());

    const match = await updateMatchInTransaction(writer, "match", {
      results: [
        { participantId: "a", score: 1 },
        { participantId: "b", score: 3 },
      ],
    });

    expect(match.winner?.id).toBe("b");
    expect(match.results.map((result) => [result.participant.id, result.score])).toStrictEqual([
      ["a", 1],
      ["b", 3],
    ]);
    expect(writer.savedMatches).toContain(match);
  });

  it("renames a match and changes its best-of length without touching its result", async () => {
    writer.matches.set("match", manualMatch());

    const match = await updateMatchInTransaction(writer, "match", {
      name: "Grand Final",
      numberOfGames: 7,
    });

    expect(match).toMatchObject({
      name: "Grand Final",
      numberOfGames: 7,
      status: "finished",
      winner: { id: "a" },
    });
  });

  it("clears the winner when the match is reopened", async () => {
    writer.matches.set("match", manualMatch());
    const match = await updateMatchInTransaction(writer, "match", { status: "running" });
    expect(match).toMatchObject({ status: "running", winner: null });
  });

  it("keeps a reopened match running even when scores are sent", async () => {
    writer.matches.set("match", Object.assign(manualMatch(), { endAt: new Date() }));

    const match = await updateMatchInTransaction(writer, "match", {
      results: [
        { participantId: "a", score: 1 },
        { participantId: "b", score: 3 },
      ],
      status: "running",
    });

    expect(match).toMatchObject({ status: "running", winner: null });
  });

  it("derives the winner from stored scores when finishing a match", async () => {
    writer.matches.set(
      "match",
      Object.assign(manualMatch(), {
        results: [
          { id: "r1", match: { id: "match" }, participant: { id: "a" }, score: 2 },
          { id: "r2", match: { id: "match" }, participant: { id: "b" }, score: 4 },
        ],
        status: "running",
        winner: null,
      }),
    );
    const match = await updateMatchInTransaction(writer, "match", { status: "finished" });
    expect(match).toMatchObject({ status: "finished", winner: { id: "b" } });
  });

  it("ends a match finished without an end date at the time of the update", async () => {
    writer.matches.set("match", Object.assign(manualMatch(), { status: "running", winner: null }));
    const before = new Date();
    const match = await updateMatchInTransaction(writer, "match", { status: "finished" });
    expect(match.endAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("keeps the end date staff send with a finished status", async () => {
    writer.matches.set("match", Object.assign(manualMatch(), { status: "running", winner: null }));
    const endAt = new Date("2026-11-02T19:12:00Z");
    const match = await updateMatchInTransaction(writer, "match", { endAt, status: "finished" });
    expect(match.endAt).toStrictEqual(endAt);
  });

  it("clears the end date when the match is reopened", async () => {
    writer.matches.set("match", Object.assign(manualMatch(), { endAt: new Date() }));
    const match = await updateMatchInTransaction(writer, "match", { status: "running" });
    expect(match.endAt).toBeNull();
  });

  it("refuses PandaScore-synced matches", async () => {
    writer.matches.set("match", Object.assign(manualMatch(), { pandascoreId: 99 }));
    await expect(
      updateMatchInTransaction(writer, "match", { status: "running" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("rejects scores for teams outside the match", async () => {
    writer.matches.set("match", manualMatch());
    await expect(
      updateMatchInTransaction(writer, "match", {
        results: [
          { participantId: "a", score: 3 },
          { participantId: "outsider", score: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.savedMatches).toStrictEqual([]);
  });
});

const syncedMatch = () =>
  Object.assign(new Match(), {
    id: "match",
    numberOfGames: 7,
    pandascoreId: 42,
    source: "pandascore",
    vods: [
      { game: 1, language: "en", source: "youtube", url: "https://youtu.be/g1" },
      { game: 5, language: "en", source: "youtube", url: "https://youtu.be/g5" },
    ],
  });

describe("Match VOD writes", () => {
  let writer = memoryMatchWriter();

  beforeEach(() => {
    writer = memoryMatchWriter();
  });

  it("replaces every VOD link, including on a PandaScore match", async () => {
    writer.matches.set("match", syncedMatch());

    const match = await setVodsInTransaction(writer, "match", [
      { game: 7, language: "FR", url: "https://www.twitch.tv/videos/1?t=2h" },
    ]);

    expect(match.vods).toStrictEqual([
      { game: 7, language: "fr", source: "twitch", url: "https://www.twitch.tv/videos/1?t=2h" },
    ]);
    expect(writer.savedMatches).toContain(match);
  });

  it("replaces the links of one game and keeps the others", async () => {
    writer.matches.set("match", syncedMatch());

    const match = await setGameVodsInTransaction(writer, "match", 5, [
      { language: "de", url: "https://youtu.be/g5?t=95" },
      { language: "en", source: "twitch", url: "https://twitch.tv/videos/5" },
    ]);

    expect(match.vods.map((vod) => [vod.game, vod.source, vod.language])).toStrictEqual([
      [1, "youtube", "en"],
      [5, "youtube", "de"],
      [5, "twitch", "en"],
    ]);
  });

  it("rejects invalid links without saving", async () => {
    writer.matches.set("match", syncedMatch());
    await expect(
      setGameVodsInTransaction(writer, "match", 8, [{ language: "en", url: "https://youtu.be/x" }]),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      setVodsInTransaction(writer, "match", [
        { game: 1, language: "en", source: "twitch", url: "https://youtu.be/x" },
      ]),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("reports a missing match", async () => {
    await expect(setVodsInTransaction(writer, "missing", [])).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps staff VOD links when PandaScore re-syncs the match", async () => {
    const tournament = Object.assign(new Tournament(), { id: "cup", source: "pandascore" });
    writer.summaries.set(tournament.id, tournament);

    writer.matches.set("match", syncedMatch());

    const match = await upsertSyncedMatchInTransaction(writer, "cup", {
      forfeitWinnerId: null,
      name: "Final",
      numberOfGames: 7,
      pandascoreId: 42,
      participantIds: [],
    });

    expect(match.vods).toHaveLength(2);
  });
});

describe("Manual bracket writes", () => {
  const stage = Object.assign(new Tournament(), { id: "finals", source: "manual" });

  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
      tournamentId: stage.id,
    }),
  );

  let writer = memoryMatchWriter();

  const semis = [
    { previousMatchId: "semi-1", type: "winner" },
    { previousMatchId: "semi-2", type: "winner" },
  ] as const;

  const emptyMatch = (overrides: Partial<Match> = {}) =>
    Object.assign(new Match(), { id: "final", tournament: stage, ...overrides });

  beforeEach(() => {
    writer = memoryMatchWriter();
    writer.summaries.set(stage.id, stage);
    writer.participantsByTournament.set(stage.id, participants);
    writer.bracketsByTournament.set(stage.id, {
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
    ).toStrictEqual([
      ["semi-1", "winner"],
      ["semi-2", "winner"],
    ]);
    expect(writer.savedMatches).toContain(match);
  });

  it("refuses a previous match of another stage", async () => {
    writer.matches.set("final", emptyMatch());
    await expect(
      updateMatchInTransaction(writer, "final", {
        previousMatches: [{ previousMatchId: "other-stage", type: "winner" }],
      }),
    ).rejects.toThrow(/same stage/u);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("refuses links that would close a cycle", async () => {
    writer.bracketsByTournament.set(stage.id, {
      hasBracket: true,
      matches: [
        { id: "semi-1", previousMatches: [] },
        { id: "semi-2", previousMatches: [] },
        { id: "final", previousMatches: [...semis] },
      ],
    });
    writer.matches.set("semi-1", emptyMatch({ id: "semi-1" }));
    await expect(
      updateMatchInTransaction(writer, "semi-1", {
        previousMatches: [{ previousMatchId: "final", type: "winner" }],
      }),
    ).rejects.toThrow(/cycle/u);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("replaces and clears the links of a manual match", async () => {
    writer.matches.set("final", emptyMatch());

    const linked = await updateMatchInTransaction(writer, "final", {
      previousMatches: [...semis],
    });

    expect(linked.previousMatches).toHaveLength(2);
    writer.matches.set("final", linked);
    const cleared = await updateMatchInTransaction(writer, "final", { previousMatches: [] });
    expect(cleared.previousMatches).toStrictEqual([]);
  });

  it("refuses bracket links and participants on a PandaScore match", async () => {
    const synced = emptyMatch({ pandascoreId: 42, source: "pandascore" });
    writer.matches.set("final", synced);
    await expect(
      updateMatchInTransaction(writer, "final", { previousMatches: [...semis] }),
    ).rejects.toThrow(/PandaScore/u);
    await expect(
      updateMatchInTransaction(writer, "final", { participantIds: ["a", "b"] }),
    ).rejects.toThrow(/PandaScore/u);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("refuses bracket links on a new match of a PandaScore stage", async () => {
    writer.summaries.set(
      "synced",
      Object.assign(new Tournament(), { id: "synced", pandascoreId: 7, source: "pandascore" }),
    );
    writer.participantsByTournament.set("synced", participants);
    await expect(
      createMatchInTransaction(writer, "synced", {
        name: "Grand Final",
        participantIds: ["a", "b"],
        previousMatches: [...semis],
      }),
    ).rejects.toThrow(/PandaScore/u);
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("fills an empty bracket match with its participants in order", async () => {
    writer.matches.set("final", emptyMatch());
    const match = await updateMatchInTransaction(writer, "final", { participantIds: ["b", "a"] });
    expect(match.participants.map((participant) => participant.id)).toStrictEqual(["b", "a"]);
  });

  it("refuses to swap the participants of a scored match without new scores", async () => {
    writer.matches.set(
      "final",
      emptyMatch({
        participants: [participants[0]].flatMap((participant) => participant ?? []),
        results: [{ id: "r", match: { id: "final" }, participant: { id: "a" }, score: 2 }],
      }),
    );
    await expect(
      updateMatchInTransaction(writer, "final", { participantIds: ["b"] }),
    ).rejects.toThrow(/scores/u);
  });

  it("generates an empty four-team bracket", async () => {
    writer.bracketsByTournament.set(stage.id, { hasBracket: true, matches: [] });

    const matches = await createEmptyBracketInTransaction(writer, stage.id, {
      numberOfGames: 7,
      teams: 4,
    });

    const [semi1, semi2, final] = matches;
    expect(matches.map((match) => [match.name, match.participants.length])).toStrictEqual([
      ["Semifinal 1", 0],
      ["Semifinal 2", 0],
      ["Grand Final", 0],
    ]);
    expect(final?.previousMatches.map(({ previousMatch }) => previousMatch.id)).toStrictEqual([
      semi1?.id,
      semi2?.id,
    ]);
    expect(matches.every((match) => match.numberOfGames === 7 && match.source === "manual")).toBe(
      true,
    );
    expect(writer.savedMatches).toHaveLength(3);
  });

  it("generates an empty bracket only on a manual bracket stage without matches", async () => {
    writer.bracketsByTournament.set(stage.id, { hasBracket: false, matches: [] });
    await expect(createEmptyBracketInTransaction(writer, stage.id, { teams: 4 })).rejects.toThrow(
      /Enable the bracket/u,
    );
    writer.bracketsByTournament.set(stage.id, {
      hasBracket: true,
      matches: [{ id: "existing", previousMatches: [] }],
    });
    await expect(createEmptyBracketInTransaction(writer, stage.id, { teams: 8 })).rejects.toThrow(
      /already has matches/u,
    );
    writer.summaries.set(
      "synced",
      Object.assign(new Tournament(), { id: "synced", pandascoreId: 7, source: "pandascore" }),
    );
    await expect(createEmptyBracketInTransaction(writer, "synced", { teams: 4 })).rejects.toThrow(
      /PandaScore/u,
    );
    expect(writer.savedMatches).toStrictEqual([]);
  });
});

const scores = (match: Match) =>
  Object.fromEntries(match.results.map((r) => [r.participant.id, r.score]));

describe("Match forfeits", () => {
  const tournament = Object.assign(new Tournament(), { id: "cup", source: "pandascore" });

  const participants = ["a", "b"].map((id) =>
    Object.assign(new TournamentParticipant(), {
      id,
      team: Object.assign(new Team(), { id: `team-${id}` }),
      tournamentId: tournament.id,
    }),
  );

  let writer = memoryMatchWriter();

  const bestOfFive = (fields: Partial<Match> = {}) =>
    Object.assign(new Match(), {
      id: "match",
      numberOfGames: 5,
      participants,
      status: "not_started",
      tournament,
      ...fields,
    });

  const forfeitedByB = async (fields: Partial<Match> = {}) => {
    writer.matches.set("match", bestOfFive(fields));

    return await setForfeitInTransaction(writer, "match", "b");
  };

  beforeEach(() => {
    writer = memoryMatchWriter();
    writer.summaries.set(tournament.id, tournament);
    writer.participantsByTournament.set(tournament.id, participants);
  });

  it("gives a PandaScore match to the other side with the series default score", async () => {
    const match = await forfeitedByB({ pandascoreId: 9 });

    expect(match).toMatchObject({
      forfeitedBy: { id: "b" },
      status: "finished",
      winner: { id: "a" },
    });
    expect(match.endAt).toBeInstanceOf(Date);
    expect(scores(match)).toStrictEqual({ a: 3, b: 0 });
    expect(writer.savedMatches).toContain(match);
  });

  it("keeps the score of a forfeit when the series length is unknown", async () => {
    const results = [{ id: "r", match: { id: "match" }, participant: { id: "a" }, score: 1 }];

    const match = await forfeitedByB({ numberOfGames: null, results });

    expect(match.results).toStrictEqual(results);
    expect(match.winner?.id).toBe("a");
  });

  it("refuses a forfeit by a side outside the match or in a one-sided match", async () => {
    writer.matches.set("match", bestOfFive());
    await expect(setForfeitInTransaction(writer, "match", "outsider")).rejects.toBeInstanceOf(
      InvalidInputError,
    );

    writer.matches.set("match", bestOfFive({ participants: participants.slice(0, 1) }));
    await expect(setForfeitInTransaction(writer, "match", "a")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.savedMatches).toStrictEqual([]);
  });

  it("clears a forfeit without touching the score or the winner", async () => {
    writer.matches.set("match", await forfeitedByB());

    const match = await setForfeitInTransaction(writer, "match", null);

    expect(match.forfeitedBy).toBeNull();
    expect(match.winner?.id).toBe("a");
    expect(scores(match)).toStrictEqual({ a: 3, b: 0 });
  });

  it("records the source given with a forfeit", async () => {
    const sourceUrl = "https://www.start.gg/tournament/cup/event/main/set/1";
    writer.matches.set("match", bestOfFive());

    const match = await setForfeitInTransaction(writer, "match", "b", sourceUrl);

    expect(match.sourceUrl).toBe(sourceUrl);
  });

  it("drops the forfeit when a correction makes the forfeiting side win", async () => {
    writer.matches.set("match", await forfeitedByB());

    const match = await updateMatchInTransaction(writer, "match", {
      results: [
        { participantId: "a", score: 1 },
        { participantId: "b", score: 3 },
      ],
    });

    expect(match.winner?.id).toBe("b");
    expect(match.forfeitedBy).toBeNull();
  });

  it("keeps the forfeit when a correction leaves the same winner", async () => {
    writer.matches.set("match", await forfeitedByB());

    const match = await updateMatchInTransaction(writer, "match", {
      results: [
        { participantId: "a", score: 3 },
        { participantId: "b", score: 1 },
      ],
    });

    expect(match.forfeitedBy?.id).toBe("b");
  });

  it("drops the forfeit when the forfeiting side is picked as winner", async () => {
    writer.matches.set("match", await forfeitedByB());

    const match = await setWinnerInTransaction(writer, "match", "b");

    expect(match.forfeitedBy).toBeNull();
  });

  it("declares the forfeit PandaScore reports against the loser", async () => {
    const match = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      forfeitWinnerId: "a",
      name: "Final",
      numberOfGames: 5,
      pandascoreId: 9,
      participantIds: ["a", "b"],
      results: [],
      status: "finished",
    });

    expect(match.forfeitedBy?.id).toBe("b");
    expect(match.winner?.id).toBe("a");
    expect(scores(match)).toStrictEqual({ a: 3, b: 0 });
  });

  it.each([
    { label: "an unplayed 0-0", status: "finished" },
    { label: "a canceled match", status: "canceled" },
  ])("keeps a staff forfeit and its score when PandaScore reports $label", async ({ status }) => {
    await forfeitedByB({ pandascoreId: 9 });

    const match = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      forfeitWinnerId: null,
      name: "Final",
      numberOfGames: 5,
      pandascoreId: 9,
      participantIds: ["a", "b"],
      results: [
        { participantId: "a", score: 0 },
        { participantId: "b", score: 0 },
      ],
      status,
    });

    expect(match.forfeitedBy?.id).toBe("b");
    expect(match.winner?.id).toBe("a");
    expect(match.status).toBe("finished");
    expect(scores(match)).toStrictEqual({ a: 3, b: 0 });
  });

  it("drops a staff forfeit once PandaScore shows the forfeiting side playing", async () => {
    await forfeitedByB({ pandascoreId: 9 });

    const match = await upsertSyncedMatchInTransaction(writer, tournament.id, {
      forfeitWinnerId: null,
      name: "Final",
      numberOfGames: 5,
      pandascoreId: 9,
      participantIds: ["a", "b"],
      results: [
        { participantId: "a", score: 3 },
        { participantId: "b", score: 1 },
      ],
      status: "finished",
    });

    expect(match.forfeitedBy).toBeNull();
    expect(scores(match)).toStrictEqual({ a: 3, b: 1 });
  });
});
