import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamScoreProposal } from "@sarpbc/types";
import {
  isForbiddenStreamScoreSource,
  streamScoreConfirmBlockers,
  streamScoreGameNeedsCheck,
  streamScoreSeriesResults,
} from "./stream-score-review";

const PROPOSAL: StreamScoreProposal = {
  bestOf: 5,
  frames: { accepted: 700, hidden: 80, read: 800, rejected: 5, unreadable: 15 },
  games: [
    {
      blue: 3,
      confidence: 0.92,
      endedAt: 330,
      endedBy: "regulation",
      number: 1,
      orange: 1,
      startedAt: 10,
      winner: "blue",
    },
    {
      blue: 1,
      confidence: 0.88,
      endedAt: 790,
      endedBy: "overtime",
      number: 2,
      orange: 2,
      startedAt: 400,
      winner: "orange",
    },
    {
      blue: 4,
      confidence: 0.9,
      endedAt: 1160,
      endedBy: "reset",
      number: 3,
      orange: 0,
      startedAt: 850,
      winner: "blue",
    },
    {
      blue: 2,
      confidence: 0.95,
      endedAt: 1520,
      endedBy: "regulation",
      number: 4,
      orange: 1,
      startedAt: 1200,
      winner: "blue",
    },
  ],
  overlay: "coupe-de-france-slash-2026",
  series: { blue: 3, orange: 1, winner: "blue" },
  source: "vod.mp4",
  sourceStartedAt: null,
};

void describe("stream score confirmation", () => {
  const review = { bestOfAcknowledged: false, checkedGames: new Set([2, 3]), numberOfGames: 5 };

  void it("flags low-confidence games and games read after the 0:00 moment", () => {
    assert.deepEqual(
      PROPOSAL.games.map((game) => streamScoreGameNeedsCheck(game)),
      [false, true, true, false],
    );
  });

  void it("allows a decided series once every flagged game is checked", () => {
    assert.deepEqual(streamScoreConfirmBlockers(PROPOSAL, review), []);
  });

  void it("blocks a flagged game until staff checks it", () => {
    assert.deepEqual(
      streamScoreConfirmBlockers(PROPOSAL, { ...review, checkedGames: new Set([2]) }),
      ["unchecked-game"],
    );
  });

  void it("blocks an unread game even when staff checked it", () => {
    const first = PROPOSAL.games.at(0);
    const second = PROPOSAL.games.at(1);
    assert.ok(first !== undefined && second !== undefined);

    const proposal: StreamScoreProposal = {
      ...PROPOSAL,
      games: [{ ...first, blue: 1, confidence: 0, orange: 1, winner: null }, second],
      series: { blue: 0, orange: 1, winner: null },
    };

    assert.deepEqual(
      streamScoreConfirmBlockers(proposal, { ...review, checkedGames: new Set([1, 2]) }),
      ["no-winner", "unread-game"],
    );
  });

  void it("blocks a best-of that disagrees with the match until staff acknowledges it", () => {
    const mismatch = { ...review, numberOfGames: 7 };
    assert.deepEqual(streamScoreConfirmBlockers(PROPOSAL, mismatch), ["best-of-mismatch"]);
    assert.deepEqual(
      streamScoreConfirmBlockers(PROPOSAL, { ...mismatch, bestOfAcknowledged: true }),
      [],
    );
    assert.deepEqual(streamScoreConfirmBlockers(PROPOSAL, { ...review, numberOfGames: null }), []);
  });

  void it("refuses a Liquipedia source and accepts a stream or a local file", () => {
    assert.equal(isForbiddenStreamScoreSource("https://liquipedia.net/rocketleague/X"), true);
    assert.equal(isForbiddenStreamScoreSource("https://www.twitch.tv/videos/1"), false);
    assert.equal(isForbiddenStreamScoreSource("vod.mp4"), false);
    assert.deepEqual(
      streamScoreConfirmBlockers(
        { ...PROPOSAL, source: "https://liquipedia.net/rocketleague/X" },
        review,
      ),
      ["forbidden-source"],
    );
  });

  void it("maps the series score to the participant on each side", () => {
    assert.deepEqual(
      streamScoreSeriesResults(PROPOSAL.series, { blue: "vitality", orange: "karmine" }),
      [
        { participantId: "vitality", score: 3 },
        { participantId: "karmine", score: 1 },
      ],
    );
  });
});
