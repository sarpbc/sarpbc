import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamScoreProposal } from "@sarpbc/types";
import { gameWinner, parseStreamScoreProposal, winsNeeded } from "./stream-score";

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

const error = (proposal: StreamScoreProposal) => {
  const parsed = parseStreamScoreProposal(JSON.stringify(proposal));

  return parsed.ok ? null : parsed.error;
};

void describe("parseStreamScoreProposal", () => {
  void it("accepts a decided series and an unfinished one", () => {
    assert.deepEqual(parseStreamScoreProposal(JSON.stringify(PROPOSAL)), {
      ok: true,
      proposal: PROPOSAL,
    });
    assert.equal(
      error({
        ...PROPOSAL,
        games: PROPOSAL.games.slice(0, 2),
        series: { blue: 1, orange: 1, winner: null },
      }),
      null,
    );
  });

  void it("accepts a game whose winner was not read", () => {
    const first = PROPOSAL.games.at(0);
    const second = PROPOSAL.games.at(1);
    assert.ok(first !== undefined && second !== undefined);
    assert.equal(
      error({
        ...PROPOSAL,
        games: [{ ...first, blue: 1, confidence: 0, orange: 1, winner: null }, second],
        series: { blue: 0, orange: 1, winner: null },
      }),
      null,
    );
  });

  void it("rejects text that is not a proposal", () => {
    assert.deepEqual(parseStreamScoreProposal("{"), { error: "invalid-json", ok: false });
    assert.equal(error({ ...PROPOSAL, bestOf: 0 }), "invalid-proposal");
  });

  void it("rejects a series that does not follow from its games", () => {
    assert.equal(
      error({ ...PROPOSAL, series: { blue: 3, orange: 1, winner: null } }),
      "inconsistent-series",
    );
    assert.equal(
      error({ ...PROPOSAL, series: { blue: 2, orange: 2, winner: "blue" } }),
      "inconsistent-series",
    );
    const first = PROPOSAL.games.at(0);
    const rest = PROPOSAL.games.slice(1);
    assert.ok(first !== undefined);
    assert.equal(
      error({ ...PROPOSAL, games: [{ ...first, winner: "orange" }, ...rest] }),
      "inconsistent-series",
    );
    assert.equal(
      error({ ...PROPOSAL, games: [{ ...first, number: 2 }, ...rest] }),
      "inconsistent-series",
    );
    assert.equal(
      error({
        ...PROPOSAL,
        games: [...PROPOSAL.games, { ...first, number: 5 }],
        series: { blue: 4, orange: 1, winner: "blue" },
      }),
      "inconsistent-series",
    );
  });
});

void describe("stream score helpers", () => {
  void it("counts the wins a best-of needs and the winner of a game", () => {
    assert.equal(winsNeeded(5), 3);
    assert.equal(winsNeeded(7), 4);
    assert.equal(gameWinner({ blue: 2, orange: 2 }), null);
    assert.equal(gameWinner({ blue: 0, orange: 1 }), "orange");
  });
});
