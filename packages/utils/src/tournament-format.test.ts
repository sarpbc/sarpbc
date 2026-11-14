import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { participantName } from "./tournament-format";

void describe("participantName", () => {
  void it("names a team participant after its team", () => {
    assert.equal(participantName({ players: [], team: { name: "Karmine Corp" } }), "Karmine Corp");
  });

  void it("names a player participant after its player", () => {
    assert.equal(participantName({ players: [{ name: "Zen" }], team: null }), "Zen");
  });

  void it("joins the players of a duo", () => {
    assert.equal(
      participantName({ players: [{ name: "Zen" }, { name: "Vatira" }], team: null }),
      "Zen / Vatira",
    );
  });
});
