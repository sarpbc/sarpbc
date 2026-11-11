import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { buildLineups, isStandIn, lineupsFromGames, normalizeLineups } from "./match-lineup";

const player = (id: string) => ({
  id,
  name: id,
  slug: id,
  imageUrl: null,
  nationality: null,
});

describe("isStandIn", () => {
  it("is false for a player on the participant roster and true otherwise", () => {
    expect(isStandIn(["alpha", "bravo", "charlie"], "bravo")).toBe(false);
    expect(isStandIn(["alpha", "bravo", "charlie"], "delta")).toBe(true);
    expect(isStandIn([], "alpha")).toBe(true);
  });
});

describe("buildLineups", () => {
  it("flags only the players outside the participant roster, in lineup order", () => {
    const lineups = buildLineups(
      [
        { participantId: "side-a", rosterIds: ["alpha", "bravo", "charlie"] },
        { participantId: "side-b", rosterIds: ["echo", "foxtrot", "golf"] },
      ],
      [
        { participantId: "side-a", player: player("alpha") },
        { participantId: "side-a", player: player("delta") },
        { participantId: "side-a", player: player("charlie") },
        { participantId: "side-b", player: player("echo") },
      ],
    );

    expect(lineups).toEqual([
      {
        participantId: "side-a",
        players: [
          { ...player("alpha"), standIn: false },
          { ...player("delta"), standIn: true },
          { ...player("charlie"), standIn: false },
        ],
      },
      { participantId: "side-b", players: [{ ...player("echo"), standIn: false }] },
    ]);
  });

  it("drops rows of a participant that no longer plays the match", () => {
    expect(
      buildLineups(
        [{ participantId: "side-a", rosterIds: [] }],
        [{ participantId: "gone", player: player("alpha") }],
      ),
    ).toEqual([]);
  });
});

describe("normalizeLineups", () => {
  const sides = ["side-a", "side-b"];

  it("orders lineups like the match participants and drops empty ones", () => {
    expect(
      normalizeLineups(sides, [
        { participantId: "side-b", playerIds: ["echo"] },
        { participantId: "side-a", playerIds: [] },
      ]),
    ).toEqual([{ participantId: "side-b", playerIds: ["echo"] }]);
  });

  it("refuses a participant outside the match, a repeated side or player, and oversized lineups", () => {
    expect(() => normalizeLineups(sides, [{ participantId: "side-c", playerIds: [] }])).toThrow(
      InvalidInputError,
    );
    expect(() =>
      normalizeLineups(sides, [
        { participantId: "side-a", playerIds: ["alpha"] },
        { participantId: "side-a", playerIds: ["bravo"] },
      ]),
    ).toThrow("two lineups");
    expect(() =>
      normalizeLineups(sides, [
        { participantId: "side-a", playerIds: ["alpha"] },
        { participantId: "side-b", playerIds: ["alpha"] },
      ]),
    ).toThrow("appears twice");
    expect(() =>
      normalizeLineups(sides, [
        { participantId: "side-a", playerIds: ["a", "b", "c", "d", "e", "f", "g"] },
      ]),
    ).toThrow("at most 6");
  });
});

describe("lineupsFromGames", () => {
  it("collects linked players per participant once, in first appearance order", () => {
    const game = (aPlayers: (string | null)[], bPlayers: (string | null)[]) => ({
      teams: [
        {
          participantId: "side-a",
          players: aPlayers.map((id) => ({ player: id ? { id } : null })),
        },
        {
          participantId: "side-b",
          players: bPlayers.map((id) => ({ player: id ? { id } : null })),
        },
      ],
    });

    expect(
      lineupsFromGames([
        game(["alpha", "bravo", null], [null, null, null]),
        game(["alpha", "delta", "bravo"], [null, null, null]),
      ]),
    ).toEqual([{ participantId: "side-a", playerIds: ["alpha", "bravo", "delta"] }]);
    expect(lineupsFromGames([])).toEqual([]);
  });
});
