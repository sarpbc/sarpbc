import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ScoreboardReading } from "./scoreboard.ts";
import { SeriesTracker } from "./series.ts";

const SOURCE = { overlay: "test", source: "vod.mp4", sourceStartedAt: null };

function score(blue: number, orange: number, clock: number, overtime = false): ScoreboardReading {
  return { kind: "score", blue, orange, clock, overtime, confidence: 0.9 };
}

function feed(tracker: SeriesTracker, readings: readonly ScoreboardReading[], from = 0): number {
  for (const [index, reading] of readings.entries()) tracker.push(from + index, reading);

  return from + readings.length;
}

function regulationGame(blue: number, orange: number): ScoreboardReading[] {
  const readings: ScoreboardReading[] = [score(0, 0, 300), score(0, 0, 299)];
  let current = { blue: 0, orange: 0 };
  let clock = 250;

  while (current.blue < blue || current.orange < orange) {
    current =
      current.blue < blue
        ? { ...current, blue: current.blue + 1 }
        : { ...current, orange: current.orange + 1 };
    readings.push(
      score(current.blue, current.orange, clock),
      score(current.blue, current.orange, clock - 1),
    );
    clock -= 30;
  }

  readings.push(score(current.blue, current.orange, 0), score(current.blue, current.orange, 0), {
    kind: "hidden",
  });

  return readings;
}

void describe("SeriesTracker", () => {
  void it("proposes each game and the series once a side has enough wins", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    let t = feed(tracker, regulationGame(3, 1));
    t = feed(tracker, regulationGame(0, 2), t);
    t = feed(tracker, regulationGame(2, 1), t);
    t = feed(tracker, regulationGame(4, 0), t);
    feed(tracker, regulationGame(1, 0), t);
    const proposal = tracker.proposal(SOURCE);
    assert.deepEqual(
      proposal.games.map((game) => [game.blue, game.orange, game.winner, game.endedBy]),
      [
        [3, 1, "blue", "regulation"],
        [0, 2, "orange", "regulation"],
        [2, 1, "blue", "regulation"],
        [4, 0, "blue", "regulation"],
      ],
    );
    assert.deepEqual(proposal.series, { blue: 3, orange: 1, winner: "blue" });
    assert.equal(tracker.decided, true);
  });

  void it("ends an overtime game on the deciding goal", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(1, 0, 120),
      score(1, 0, 119),
      score(1, 1, 30),
      score(1, 1, 29),
      score(1, 1, 0),
      score(1, 1, 0),
      score(1, 1, 3, true),
      score(1, 1, 4, true),
      score(1, 2, 5, true),
      score(1, 2, 5, true),
    ]);
    assert.deepEqual(
      tracker.games.map((game) => [game.blue, game.orange, game.endedBy, game.endedAt]),
      [[1, 2, "overtime", 11]],
    );
  });

  void it("keeps an overtime goal seen once before the next kickoff", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(0, 0, 0),
      score(0, 0, 0),
      score(0, 0, 10, true),
      score(0, 0, 11, true),
      score(1, 0, 12, true),
      { kind: "hidden" },
      score(0, 0, 300),
      score(0, 0, 300),
    ]);
    assert.deepEqual(
      tracker.games.map((game) => [game.blue, game.orange, game.endedBy, game.endedAt]),
      [[1, 0, "reset", 6]],
    );
  });

  void it("keeps an overtime game whose deciding goal was never read as undecided", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(1, 1, 80),
      score(1, 1, 79),
      score(1, 1, 30, true),
      score(1, 1, 31, true),
      { kind: "hidden" },
      score(0, 0, 300),
      score(0, 0, 299),
      score(2, 0, 100),
      score(2, 0, 99),
      score(2, 0, 0),
      score(2, 0, 0),
    ]);
    const proposal = tracker.proposal(SOURCE);
    assert.deepEqual(
      proposal.games.map((game) => [
        game.number,
        game.blue,
        game.orange,
        game.winner,
        game.confidence,
      ]),
      [
        [1, 1, 1, null, 0],
        [2, 2, 0, "blue", 1],
      ],
    );
    assert.deepEqual(proposal.series, { blue: 1, orange: 0, winner: null });
  });

  void it("drops a game restarted from kickoff during regulation", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(0, 0, 250),
      score(0, 0, 249),
      score(0, 0, 300),
      score(0, 0, 300),
      score(1, 0, 100),
      score(1, 0, 99),
      score(1, 0, 0),
      score(1, 0, 0),
    ]);
    assert.deepEqual(
      tracker.games.map((game) => [game.number, game.blue, game.orange, game.startedAt]),
      [[1, 1, 0, 4]],
    );
  });

  void it("closes a game at the next kickoff when the final clock was missed", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(2, 1, 40),
      score(2, 1, 39),
      { kind: "hidden" },
      score(0, 0, 300),
      score(0, 0, 300),
    ]);
    assert.deepEqual(
      tracker.games.map((game) => [game.blue, game.orange, game.endedBy, game.endedAt]),
      [[2, 1, "reset", 3]],
    );
  });

  void it("ignores single misreads, decreasing scores and screens without a scoreboard", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(1, 0, 200),
      score(1, 0, 199),
      score(7, 0, 198),
      { kind: "unreadable" },
      score(1, 0, 197),
      score(0, 1, 150),
      score(0, 1, 149),
      { kind: "hidden" },
      score(1, 0, 0),
      score(1, 0, 0),
    ]);
    const proposal = tracker.proposal(SOURCE);
    assert.deepEqual(
      proposal.games.map((game) => [game.blue, game.orange, game.endedBy, game.confidence]),
      [[1, 0, "regulation", 0.7]],
    );
    assert.deepEqual(proposal.frames, {
      read: 12,
      accepted: 10,
      hidden: 1,
      unreadable: 1,
      rejected: 1,
    });
  });

  void it("does not propose a game cut before its end", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [score(0, 0, 300), score(0, 0, 299), score(1, 0, 100), score(1, 0, 99)]);
    tracker.finish();
    assert.deepEqual(tracker.games, []);
    assert.equal(tracker.proposal(SOURCE).series.winner, null);
  });

  void it("keeps the final overtime goal when the stream ends right after it", () => {
    const tracker = new SeriesTracker({ bestOf: 1, stableReadings: 2 });
    feed(tracker, [
      score(0, 0, 300),
      score(0, 0, 299),
      score(0, 0, 0),
      score(0, 0, 0),
      score(0, 0, 1, true),
      score(0, 0, 2, true),
      score(0, 1, 3, true),
    ]);
    tracker.finish();
    assert.deepEqual(
      tracker.games.map((game) => [game.blue, game.orange, game.endedBy]),
      [[0, 1, "stream_end"]],
    );
    assert.equal(tracker.proposal(SOURCE).series.winner, "orange");
  });

  void it("waits for a kickoff before tracking the next game", () => {
    const tracker = new SeriesTracker({ bestOf: 5, stableReadings: 2 });
    feed(tracker, [
      ...regulationGame(1, 0),
      score(1, 0, 0),
      score(1, 0, 0),
      score(0, 0, 300),
      score(0, 0, 299),
      score(0, 1, 250),
      score(0, 1, 249),
      score(0, 1, 0),
      score(0, 1, 0),
    ]);
    assert.deepEqual(
      tracker.games.map((game) => [game.number, game.blue, game.orange]),
      [
        [1, 1, 0],
        [2, 0, 1],
      ],
    );
  });
});
