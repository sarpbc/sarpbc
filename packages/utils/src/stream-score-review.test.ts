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
  overlay: "coupe-de-france-slash-2026",
  source: "vod.mp4",
  sourceStartedAt: null,
  bestOf: 5,
  games: [
    {
      number: 1,
      blue: 3,
      orange: 1,
      winner: "blue",
      endedBy: "regulation",
      startedAt: 10,
      endedAt: 330,
      confidence: 0.92,
    },
    {
      number: 2,
      blue: 1,
      orange: 2,
      winner: "orange",
      endedBy: "overtime",
      startedAt: 400,
      endedAt: 790,
      confidence: 0.88,
    },
    {
      number: 3,
      blue: 4,
      orange: 0,
      winner: "blue",
      endedBy: "reset",
      startedAt: 850,
      endedAt: 1160,
      confidence: 0.9,
    },
    {
      number: 4,
      blue: 2,
      orange: 1,
      winner: "blue",
      endedBy: "regulation",
      startedAt: 1200,
      endedAt: 1520,
      confidence: 0.95,
    },
  ],
  series: { blue: 3, orange: 1, winner: "blue" },
  frames: { read: 800, accepted: 700, hidden: 80, unreadable: 15, rejected: 5 },
};

void describe("stream score confirmation", () => {
  const review = { numberOfGames: 5, checkedGames: new Set([2, 3]), bestOfAcknowledged: false };

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
      games: [{ ...first, blue: 1, orange: 1, winner: null, confidence: 0 }, second],
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
