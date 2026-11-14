import { describe, expect, it } from "vitest";
import {
  assignReplays,
  resolvePlayerId,
  type CandidateMatch,
  type CandidateParticipant,
  type ReplayAssignment,
  type ReplaySummary,
} from "./replay-matching";

const kc: CandidateParticipant = {
  id: "p-kc",
  teamNames: ["Karmine Corp"],
  players: [
    { id: "vatira", name: "Vatira" },
    { id: "atow", name: "Atow" },
    { id: "rise", name: "Rise." },
  ],
};

const bds: CandidateParticipant = {
  id: "p-bds",
  teamNames: ["Team BDS"],
  players: [
    { id: "monkey", name: "M0nkey M00n" },
    { id: "seikoo", name: "Seikoo" },
    { id: "exotiik", name: "ExoTiiK" },
  ],
};

const vit: CandidateParticipant = {
  id: "p-vit",
  teamNames: ["Team Vitality"],
  players: [
    { id: "zen", name: "zen" },
    { id: "alpha", name: "Alpha54" },
    { id: "radosin", name: "Radosin" },
  ],
};

const KC_NAMES = ["Vatira", "Atow", "Rise"];
const BDS_NAMES = ["M0nkey M00n", "Seikoo", "ExoTiiK"];
const VIT_NAMES = ["zen", "Alpha54", "Radosin"];

function at(iso: string): Date {
  return new Date(iso);
}

function won(winner: CandidateParticipant, loser: CandidateParticipant, games = 1) {
  return new Map([
    [winner.id, games],
    [loser.id, 0],
  ]);
}

function match(
  id: string,
  participants: CandidateParticipant[],
  beginAt: string | null,
  overrides: Partial<CandidateMatch> = {},
): CandidateMatch {
  return {
    id,
    beginAt: beginAt === null ? null : at(beginAt),
    endAt: null,
    finished: true,
    numberOfGames: 5,
    participants,
    scores: new Map(),
    storedReplayIds: [],
    ...overrides,
  };
}

let sequence = 0;

function replay(
  playedAt: string | null,
  blue: { names: string[]; goals: number; name?: string },
  orange: { names: string[]; goals: number; name?: string },
  overrides: Partial<ReplaySummary> = {},
): ReplaySummary {
  sequence += 1;

  return {
    id: `r-${String(sequence).padStart(3, "0")}`,
    rocketLeagueId: `guid-${sequence}`,
    title: `Replay ${sequence}`,
    playedAt: playedAt === null ? null : at(playedAt),
    playedAtHasTimezone: true,
    blue: { name: blue.name ?? null, goals: blue.goals, playerNames: blue.names },
    orange: { name: orange.name ?? null, goals: orange.goals, playerNames: orange.names },
    ...overrides,
  };
}

function describeAssignment(assignment: ReplayAssignment): string {
  if (assignment.kind === "matched") {
    return `${assignment.matchId}#${assignment.gameNumber} blue=${assignment.sides.blue}`;
  }

  if (assignment.kind === "stored") return `stored:${assignment.matchId}#${assignment.gameNumber}`;

  return `unmatched:${assignment.reason}${assignment.matchId === null ? "" : `@${assignment.matchId}`}`;
}

function byReplay(assignments: ReplayAssignment[]) {
  return Object.fromEntries(
    assignments.map((assignment) => [assignment.replay.id, describeAssignment(assignment)]),
  );
}

describe("assignReplays with player participants", () => {
  const zen: CandidateParticipant = {
    id: "p-zen",
    teamNames: ["zen"],
    players: [{ id: "zen", name: "zen" }],
  };

  const vatira: CandidateParticipant = {
    id: "p-vatira",
    teamNames: ["Vatira"],
    players: [{ id: "vatira", name: "Vatira" }],
  };

  it("orients a 1v1 replay by the player on each side", () => {
    const final = match("m1v1", [zen, vatira], "2026-06-01T18:00:00Z", {
      scores: won(vatira, zen),
      numberOfGames: 1,
    });

    const game = replay(
      "2026-06-01T18:05:00Z",
      { names: ["Vatira"], goals: 2 },
      { names: ["zen"], goals: 1 },
    );

    expect(byReplay(assignReplays([game], [final]))).toEqual({
      [game.id]: "m1v1#1 blue=p-vatira",
    });
  });

  it("leaves a 1v1 replay of other players unmatched", () => {
    const final = match("m1v1", [zen, vatira], "2026-06-01T18:00:00Z", {
      scores: won(vatira, zen),
      numberOfGames: 1,
    });

    const game = replay(
      "2026-06-01T18:05:00Z",
      { names: ["Atow"], goals: 2 },
      { names: ["Rise"], goals: 1 },
    );

    expect(byReplay(assignReplays([game], [final]))).toEqual({
      [game.id]: "unmatched:unknown_teams",
    });
  });
});

const bo5 = (overrides: Partial<CandidateMatch> = {}) =>
  match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
    scores: won(kc, bds, 3),
    ...overrides,
  });

const sweep = () => [
  replay("2026-06-01T18:05:00Z", { names: KC_NAMES, goals: 1 }, { names: BDS_NAMES, goals: 0 }),
  replay("2026-06-01T18:25:00Z", { names: KC_NAMES, goals: 2 }, { names: BDS_NAMES, goals: 0 }),
  replay("2026-06-01T18:45:00Z", { names: KC_NAMES, goals: 3 }, { names: BDS_NAMES, goals: 0 }),
];

describe(assignReplays, () => {
  it("numbers a complete series by replay date and keeps the sides of each game", () => {
    const final = match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
      scores: new Map([
        ["p-kc", 3],
        ["p-bds", 1],
      ]),
    });

    const g2 = replay(
      "2026-06-01T18:25:00Z",
      { names: BDS_NAMES, goals: 2 },
      { names: KC_NAMES, goals: 1 },
    );

    const g1 = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 3 },
      { names: BDS_NAMES, goals: 0 },
    );

    const g4 = replay(
      "2026-06-01T19:05:00Z",
      { names: KC_NAMES, goals: 2 },
      { names: BDS_NAMES, goals: 1 },
    );

    const g3 = replay(
      "2026-06-01T18:45:00Z",
      { names: BDS_NAMES, goals: 0 },
      { names: KC_NAMES, goals: 4 },
    );

    expect(byReplay(assignReplays([g2, g4, g1, g3], [final]))).toEqual({
      [g1.id]: "m1#1 blue=p-kc",
      [g2.id]: "m1#2 blue=p-bds",
      [g3.id]: "m1#3 blue=p-bds",
      [g4.id]: "m1#4 blue=p-kc",
    });
  });

  it("recognises tagged and punctuated in-game names without team names", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const game = replay(
      "2026-06-01T18:10:00Z",
      { names: ["KC Vatira", "Atow.", "kc rise"], goals: 1, name: "BLUE" },
      { names: ["BDS.M0nkey M00n", "seikoo", "Exotiik"], goals: 0, name: "ORANGE" },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({ [game.id]: "m1#1 blue=p-kc" });
  });

  it("accepts one substitute on the roster majority", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const game = replay(
      "2026-06-01T18:10:00Z",
      { names: ["Vatira", "Atow", "Stand-in"], goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({ [game.id]: "m1#1 blue=p-kc" });
  });

  it("needs the team name when two substitutes leave a single known player", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const named = replay(
      "2026-06-01T18:10:00Z",
      { names: ["Vatira", "Sub One", "Sub Two"], goals: 1, name: "KARMINE CORP" },
      { names: BDS_NAMES, goals: 0, name: "BDS" },
    );

    const anonymous = replay(
      "2026-06-01T18:30:00Z",
      { names: ["Vatira", "Sub One", "Sub Two"], goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([named, anonymous], [m]))).toEqual({
      [named.id]: "m1#1 blue=p-kc",
      [anonymous.id]: "unmatched:unknown_teams",
    });
  });

  it("uses team names alone only when the participant has no known roster", () => {
    const unknownRoster = { ...vit, players: [] };

    const m = match("m1", [unknownRoster, bds], "2026-06-01T18:00:00Z", {
      scores: won(unknownRoster, bds),
    });

    const game = replay(
      "2026-06-01T18:10:00Z",
      { names: ["a", "b", "c"], goals: 2, name: "VITALITY" },
      { names: BDS_NAMES, goals: 1, name: "BDS" },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({ [game.id]: "m1#1 blue=p-vit" });
  });

  it("recognises a former name of the team", () => {
    const renamed = { ...vit, teamNames: ["Fixture Now", "Team Vitality"], players: [] };

    const m = match("m1", [renamed, bds], "2026-06-01T18:00:00Z", {
      scores: won(renamed, bds),
    });

    const game = replay(
      "2026-06-01T18:10:00Z",
      { names: ["a", "b", "c"], goals: 2, name: "VITALITY" },
      { names: BDS_NAMES, goals: 1, name: "BDS" },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({ [game.id]: "m1#1 blue=p-vit" });
  });

  it("rejects a team name that contradicts the roster", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z");

    const game = replay(
      "2026-06-01T18:10:00Z",
      { names: BDS_NAMES, goals: 1, name: "Karmine Corp" },
      { names: BDS_NAMES, goals: 0, name: "BDS" },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({
      [game.id]: "unmatched:unknown_teams",
    });
  });

  it("separates rematches between the same teams on different days", () => {
    const groups = match("groups", [kc, bds], "2026-05-28T15:00:00Z", {
      endAt: at("2026-05-28T16:10:00Z"),
      scores: won(kc, bds),
    });

    const playoffs = match("playoffs", [bds, kc], "2026-06-01T18:00:00Z", {
      scores: won(kc, bds),
    });

    const early = replay(
      "2026-05-28T15:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    const late = replay(
      "2026-06-01T18:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([early, late], [groups, playoffs]))).toEqual({
      [early.id]: "groups#1 blue=p-kc",
      [late.id]: "playoffs#1 blue=p-kc",
    });
  });

  it("splits a same-day upper final and grand final by the latest started match", () => {
    const upper = match("upper", [kc, bds], "2026-06-01T14:00:00Z", { scores: won(kc, bds) });
    const grand = match("grand", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(bds, kc) });

    const upperGame = replay(
      "2026-06-01T14:30:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    const grandGame = replay(
      "2026-06-01T18:20:00Z",
      { names: KC_NAMES, goals: 0 },
      { names: BDS_NAMES, goals: 2 },
    );

    expect(byReplay(assignReplays([upperGame, grandGame], [upper, grand]))).toEqual({
      [upperGame.id]: "upper#1 blue=p-kc",
      [grandGame.id]: "grand#1 blue=p-kc",
    });
  });

  it("keeps a late game of the upper final out of a grand final that has not begun", () => {
    const upper = match("upper", [kc, bds], "2026-06-01T14:00:00Z", {
      endAt: at("2026-06-01T17:30:00Z"),
      scores: won(kc, bds),
    });

    const grand = match("grand", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(bds, kc) });

    const lateUpperGame = replay(
      "2026-06-01T17:10:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([lateUpperGame], [upper, grand]))).toEqual({
      [lateUpperGame.id]: "upper#1 blue=p-kc",
    });
  });

  it("accepts a match that started early when no other match fits", () => {
    const groups = match("groups", [kc, bds], "2026-05-28T15:00:00Z", {
      endAt: at("2026-05-28T16:10:00Z"),
      scores: won(bds, kc),
    });

    const final = match("final", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const earlyGame = replay(
      "2026-06-01T17:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([earlyGame], [groups, final]))).toEqual({
      [earlyGame.id]: "final#1 blue=p-kc",
    });
  });

  it("refuses to choose between two matches that have not begun", () => {
    const first = match("a", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });
    const second = match("b", [kc, bds], "2026-06-01T18:30:00Z", { scores: won(kc, bds) });

    const game = replay(
      "2026-06-01T17:40:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([game], [first, second]))).toEqual({
      [game.id]: "unmatched:ambiguous_match",
    });
  });

  it("refuses to choose between two matches scheduled at the same time", () => {
    const first = match("a", [kc, bds], "2026-06-01T18:00:00Z");
    const second = match("b", [bds, kc], "2026-06-01T18:00:00Z");

    const game = replay(
      "2026-06-01T18:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([game], [first, second]))).toEqual({
      [game.id]: "unmatched:ambiguous_match",
    });
  });

  it("refuses overlapping windows when the replay date has no timezone", () => {
    const upper = match("upper", [kc, bds], "2026-06-01T14:00:00Z");
    const grand = match("grand", [kc, bds], "2026-06-01T18:00:00Z");

    const game = replay(
      "2026-06-01T18:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
      { playedAtHasTimezone: false },
    );

    expect(byReplay(assignReplays([game], [upper, grand]))).toEqual({
      [game.id]: "unmatched:ambiguous_match",
    });
  });

  it("tolerates an unknown timezone when a single match fits", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const game = replay(
      "2026-06-01T11:10:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
      { playedAtHasTimezone: false },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({ [game.id]: "m1#1 blue=p-kc" });
  });

  it("reports replays outside every match window, without a date or with unknown teams", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
      endAt: at("2026-06-01T19:00:00Z"),
    });

    const unscheduled = match("m2", [kc, vit], null);

    const tooLate = replay(
      "2026-06-01T21:30:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    const undated = replay(null, { names: KC_NAMES, goals: 1 }, { names: BDS_NAMES, goals: 0 });

    const strangers = replay(
      "2026-06-01T18:20:00Z",
      { names: ["x", "y", "z"], goals: 1 },
      { names: ["u", "v", "w"], goals: 0 },
    );

    const unscheduledGame = replay(
      "2026-06-01T18:20:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: VIT_NAMES, goals: 0 },
    );

    expect(
      byReplay(assignReplays([tooLate, undated, strangers, unscheduledGame], [m, unscheduled])),
    ).toEqual({
      [tooLate.id]: "unmatched:outside_match_window",
      [undated.id]: "unmatched:missing_date",
      [strangers.id]: "unmatched:unknown_teams",
      [unscheduledGame.id]: "unmatched:outside_match_window",
    });
  });

  it("keeps the first upload of a game and reports the duplicate", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { scores: won(kc, bds) });

    const original = replay(
      "2026-06-01T18:10:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
      { rocketLeagueId: "same" },
    );

    const copy = replay(
      "2026-06-01T18:10:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
      { rocketLeagueId: "same" },
    );

    expect(byReplay(assignReplays([copy, original], [m]))).toEqual({
      [original.id]: "m1#1 blue=p-kc",
      [copy.id]: "unmatched:duplicate_replay",
    });
  });

  it("holds back a series with missing games, since their order is unknown", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
      scores: new Map([
        ["p-kc", 3],
        ["p-bds", 1],
      ]),
    });

    const games = [
      replay("2026-06-01T18:05:00Z", { names: KC_NAMES, goals: 1 }, { names: BDS_NAMES, goals: 0 }),
      replay("2026-06-01T18:25:00Z", { names: KC_NAMES, goals: 2 }, { names: BDS_NAMES, goals: 0 }),
      replay("2026-06-01T18:45:00Z", { names: KC_NAMES, goals: 3 }, { names: BDS_NAMES, goals: 0 }),
    ];

    expect(new Set(Object.values(byReplay(assignReplays(games, [m]))))).toEqual(
      new Set(["unmatched:incomplete_series@m1"]),
    );
  });

  it("rejects a series whose winners contradict the recorded score", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
      scores: new Map([
        ["p-kc", 1],
        ["p-bds", 0],
      ]),
    });

    const game = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 0 },
      { names: BDS_NAMES, goals: 2 },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({
      [game.id]: "unmatched:inconsistent_series@m1",
    });
  });

  it("rejects more games than the format allows and drawn replays", () => {
    const bo1 = match("bo1", [kc, bds], "2026-06-01T18:00:00Z", { numberOfGames: 1 });
    const other = match("other", [kc, vit], "2026-06-02T18:00:00Z");

    const twice = [
      replay("2026-06-01T18:05:00Z", { names: KC_NAMES, goals: 1 }, { names: BDS_NAMES, goals: 0 }),
      replay("2026-06-01T18:25:00Z", { names: KC_NAMES, goals: 2 }, { names: BDS_NAMES, goals: 0 }),
    ];

    const drawn = replay(
      "2026-06-02T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: VIT_NAMES, goals: 1 },
    );

    expect(byReplay(assignReplays([...twice, drawn], [bo1, other]))).toEqual({
      [twice[0].id]: "unmatched:inconsistent_series@bo1",
      [twice[1].id]: "unmatched:inconsistent_series@bo1",
      [drawn.id]: "unmatched:inconsistent_series@other",
    });
  });

  it("never mixes in games when the match already holds stats from other replays", () => {
    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", { storedReplayIds: ["elsewhere"] });

    const game = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([game], [m]))).toEqual({
      [game.id]: "unmatched:match_has_other_stats@m1",
    });
  });

  it("holds back matches that are not finished or have no recorded score", () => {
    const live = match("live", [kc, bds], "2026-06-01T18:00:00Z", {
      finished: false,
      scores: won(kc, bds),
    });

    const unscored = match("unscored", [kc, vit], "2026-06-02T18:00:00Z");

    const liveGame = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    const unscoredGame = replay(
      "2026-06-02T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: VIT_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([liveGame, unscoredGame], [live, unscored]))).toEqual({
      [liveGame.id]: "unmatched:match_not_finished@live",
      [unscoredGame.id]: "unmatched:match_not_finished@unscored",
    });
  });

  it("reports stored games where they are when the group is imported again", () => {
    const first = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    const second = replay(
      "2026-06-01T18:25:00Z",
      { names: BDS_NAMES, goals: 1 },
      { names: KC_NAMES, goals: 0 },
    );

    const m = match("m1", [kc, bds], "2026-06-01T18:00:00Z", {
      scores: new Map([
        ["p-kc", 1],
        ["p-bds", 1],
      ]),
      storedReplayIds: [first.id],
    });

    const stored = new Map([[first.id, { matchId: "m1", number: 1 }]]);

    expect(byReplay(assignReplays([second, first], [m], stored))).toEqual({
      [first.id]: "stored:m1#1",
      [second.id]: "m1#2 blue=p-bds",
    });
  });

  describe("after staff changes", () => {
    it("reports a removed replay as excluded and holds back its series as incomplete", () => {
      const [g1, g2, g3] = sweep();
      const m = bo5({ storedReplayIds: [g1.id, g3.id] });

      const stored = new Map([
        [g1.id, { matchId: "m1", number: 1 }],
        [g3.id, { matchId: "m1", number: 3 }],
      ]);

      expect(byReplay(assignReplays([g1, g2, g3], [m], stored, new Set([g2.id])))).toEqual({
        [g1.id]: "stored:m1#1",
        [g2.id]: "unmatched:excluded_by_staff",
        [g3.id]: "stored:m1#3",
      });
    });

    it("counts a removed replay as absent, so new games of its series wait", () => {
      const [g1, g2, g3] = sweep();

      expect(byReplay(assignReplays([g1, g2, g3], [bo5()], new Map(), new Set([g1.id])))).toEqual({
        [g1.id]: "unmatched:excluded_by_staff",
        [g2.id]: "unmatched:incomplete_series@m1",
        [g3.id]: "unmatched:incomplete_series@m1",
      });
    });

    it("keeps another upload of a removed or stored game out, earlier or later", () => {
      const [g1] = sweep();
      const removedCopy = { ...g1, id: "r-removed-copy", playedAt: at("2026-06-01T18:06:00Z") };
      const storedCopy = { ...g1, id: "r-stored-copy", playedAt: at("2026-06-01T18:04:00Z") };

      expect(
        byReplay(assignReplays([g1, removedCopy], [bo5()], new Map(), new Set([removedCopy.id]))),
      ).toEqual({
        [g1.id]: "unmatched:duplicate_replay",
        [removedCopy.id]: "unmatched:excluded_by_staff",
      });
      expect(
        byReplay(
          assignReplays(
            [g1, storedCopy],
            [bo5({ storedReplayIds: [g1.id] })],
            new Map([[g1.id, { matchId: "m1", number: 1 }]]),
          ),
        ),
      ).toEqual({
        [g1.id]: "stored:m1#1",
        [storedCopy.id]: "unmatched:duplicate_replay",
      });
    });

    it("never renumbers a game staff attached under another number", () => {
      const [g1, g2, g3] = sweep();
      const m = bo5({ storedReplayIds: [g1.id] });

      expect(
        byReplay(
          assignReplays([g1, g2, g3], [m], new Map([[g1.id, { matchId: "m1", number: 3 }]])),
        ),
      ).toEqual({
        [g1.id]: "stored:m1#3",
        [g2.id]: "unmatched:match_has_other_stats@m1",
        [g3.id]: "unmatched:match_has_other_stats@m1",
      });
    });

    it("leaves a game staff attached to another match out of the series it fits", () => {
      const [g1, g2, g3] = sweep();

      const other = match("other", [kc, vit], "2026-06-02T18:00:00Z", {
        storedReplayIds: [g1.id],
      });

      expect(
        byReplay(
          assignReplays(
            [g1, g2, g3],
            [bo5(), other],
            new Map([[g1.id, { matchId: "other", number: 1 }]]),
          ),
        ),
      ).toEqual({
        [g1.id]: "stored:other#1",
        [g2.id]: "unmatched:incomplete_series@m1",
        [g3.id]: "unmatched:incomplete_series@m1",
      });
    });

    it("never mixes a match holding a manual game from outside the group", () => {
      const [g1, g2, g3] = sweep();
      const m = bo5({ storedReplayIds: ["manual"] });

      expect(byReplay(assignReplays([g1, g2, g3], [m]))).toEqual({
        [g1.id]: "unmatched:match_has_other_stats@m1",
        [g2.id]: "unmatched:match_has_other_stats@m1",
        [g3.id]: "unmatched:match_has_other_stats@m1",
      });
    });

    it("completes a series around a game staff attached under its date-order number", () => {
      const [g1, g2, g3] = sweep();
      const m = bo5({ storedReplayIds: [g2.id] });

      expect(
        byReplay(
          assignReplays([g1, g2, g3], [m], new Map([[g2.id, { matchId: "m1", number: 2 }]])),
        ),
      ).toEqual({
        [g1.id]: "m1#1 blue=p-kc",
        [g2.id]: "stored:m1#2",
        [g3.id]: "m1#3 blue=p-kc",
      });
    });
  });

  it("ignores matches without two participants", () => {
    const tbd = match("tbd", [kc], "2026-06-01T18:00:00Z");

    const game = replay(
      "2026-06-01T18:05:00Z",
      { names: KC_NAMES, goals: 1 },
      { names: BDS_NAMES, goals: 0 },
    );

    expect(byReplay(assignReplays([game], [tbd]))).toEqual({
      [game.id]: "unmatched:unknown_teams",
    });
  });
});

describe(resolvePlayerId, () => {
  it("resolves a single roster match and keeps substitutes or clashes unresolved", () => {
    expect(resolvePlayerId("KC Vatira", kc.players)).toBe("vatira");
    expect(resolvePlayerId("Stand-in", kc.players)).toBeNull();
    expect(
      resolvePlayerId("Alpha", [
        { id: "a", name: "Alpha" },
        { id: "b", name: "alpha." },
      ]),
    ).toBeNull();
  });
});
