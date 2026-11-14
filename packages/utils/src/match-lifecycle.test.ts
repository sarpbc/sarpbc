import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMatchFinished, isMatchLive, winnerFromResults } from "./match-lifecycle";

const now = new Date("2026-01-01T12:00:00Z");

void describe("isMatchFinished", () => {
  void it("is finished by status or by an end time", () => {
    assert.equal(isMatchFinished({ status: "finished" }), true);
    assert.equal(isMatchFinished({ endAt: "2026-01-01T10:00:00Z" }), true);
    assert.equal(isMatchFinished({ status: "running", endAt: null }), false);
    assert.equal(isMatchFinished({}), false);
  });
});

void describe("isMatchLive", () => {
  void it("is live once begun and not finished", () => {
    assert.equal(isMatchLive({ beginAt: "2026-01-01T11:00:00Z" }, now), true);
    assert.equal(isMatchLive({ beginAt: now }, now.getTime()), true);
    assert.equal(isMatchLive({ beginAt: "2026-01-01T13:00:00Z" }, now), false);
    assert.equal(isMatchLive({ beginAt: null }, now), false);
    assert.equal(isMatchLive({ beginAt: "2026-01-01T11:00:00Z", status: "finished" }, now), false);
    assert.equal(
      isMatchLive({ beginAt: "2026-01-01T11:00:00Z", endAt: "2026-01-01T11:30:00Z" }, now),
      false,
    );
  });
});

void describe("winnerFromResults", () => {
  void it("returns the participant with the strictly highest score", () => {
    assert.equal(
      winnerFromResults([
        { participantId: "a", score: 3 },
        { participantId: "b", score: 1 },
      ]),
      "a",
    );
  });

  void it("returns null on a tie at the top", () => {
    assert.equal(
      winnerFromResults([
        { participantId: "a", score: 2 },
        { participantId: "b", score: 2 },
      ]),
      null,
    );
    assert.equal(
      winnerFromResults([
        { participantId: "a", score: 3 },
        { participantId: "b", score: 1 },
        { participantId: "c", score: 3 },
      ]),
      null,
    );
  });

  void it("returns null with fewer than two scored participants", () => {
    assert.equal(winnerFromResults([{ participantId: "a", score: 3 }]), null);
    assert.equal(winnerFromResults([]), null);
    assert.equal(
      winnerFromResults([
        { participantId: "a", score: 3 },
        { participantId: "", score: 0 },
      ]),
      null,
    );
  });
});
