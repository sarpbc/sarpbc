import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NO_SPOILER_REVEALS, isSpoilerConcealed, revealSpoilers } from "./spoiler";

const scope = { matchId: "match-1", tournamentId: "tournament-1" };

void describe("isSpoilerConcealed", () => {
  void it("shows every result when spoiler-free mode is off", () => {
    assert.equal(isSpoilerConcealed(false, NO_SPOILER_REVEALS, scope), false);
    assert.equal(isSpoilerConcealed(false, NO_SPOILER_REVEALS, {}), false);
  });

  void it("conceals results when spoiler-free mode is on and nothing was revealed", () => {
    assert.equal(isSpoilerConcealed(true, NO_SPOILER_REVEALS, scope), true);
    assert.equal(isSpoilerConcealed(true, NO_SPOILER_REVEALS, { matchId: "match-1" }), true);
    assert.equal(isSpoilerConcealed(true, NO_SPOILER_REVEALS, {}), true);
  });

  void it("shows a match once that match is revealed", () => {
    const reveals = revealSpoilers(NO_SPOILER_REVEALS, { id: "match-1", kind: "match" });
    assert.equal(isSpoilerConcealed(true, reveals, scope), false);
    assert.equal(
      isSpoilerConcealed(true, reveals, { matchId: "match-2", tournamentId: "tournament-1" }),
      true,
    );
    assert.equal(isSpoilerConcealed(true, reveals, { tournamentId: "tournament-1" }), true);
  });

  void it("shows every match of a tournament once the tournament is revealed", () => {
    const reveals = revealSpoilers(NO_SPOILER_REVEALS, { id: "tournament-1", kind: "tournament" });
    assert.equal(isSpoilerConcealed(true, reveals, scope), false);
    assert.equal(
      isSpoilerConcealed(true, reveals, { matchId: "match-2", tournamentId: "tournament-1" }),
      false,
    );
    assert.equal(isSpoilerConcealed(true, reveals, { tournamentId: "tournament-1" }), false);
    assert.equal(
      isSpoilerConcealed(true, reveals, { matchId: "match-3", tournamentId: "tournament-2" }),
      true,
    );
  });
});

void describe("revealSpoilers", () => {
  void it("is idempotent", () => {
    const once = revealSpoilers(NO_SPOILER_REVEALS, { id: "match-1", kind: "match" });
    assert.equal(revealSpoilers(once, { id: "match-1", kind: "match" }), once);
    const tournament = revealSpoilers(once, { id: "tournament-1", kind: "tournament" });
    assert.equal(
      revealSpoilers(tournament, { id: "tournament-1", kind: "tournament" }),
      tournament,
    );
    assert.deepEqual(tournament, { matchIds: ["match-1"], tournamentIds: ["tournament-1"] });
  });

  void it("does not mutate the previous reveals", () => {
    revealSpoilers(NO_SPOILER_REVEALS, { id: "match-1", kind: "match" });
    assert.deepEqual(NO_SPOILER_REVEALS, { matchIds: [], tournamentIds: [] });
  });
});
