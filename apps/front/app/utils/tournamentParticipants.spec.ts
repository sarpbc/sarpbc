import { describe, expect, it } from "vitest";
import {
  buildTournamentParticipantEntries,
  hasReliableParticipantRoster,
} from "./tournamentParticipants";
import type { Tournament } from "~/types/tournament";

describe("hasReliableParticipantRoster", () => {
  it("returns true when at least one player has a slug", () => {
    expect(
      hasReliableParticipantRoster([
        { id: "1", name: "Alpha", slug: "alpha" } as never,
        { id: "2", name: "Beta" } as never,
      ]),
    ).toBe(true);
  });

  it("returns false when no players have slugs", () => {
    expect(hasReliableParticipantRoster([{ id: "1", name: "Alpha" } as never])).toBe(false);
    expect(hasReliableParticipantRoster([])).toBe(false);
    expect(hasReliableParticipantRoster(undefined)).toBe(false);
  });
});

describe("buildTournamentParticipantEntries", () => {
  it("deduplicates teams and sorts players", () => {
    const tournament = {
      participants: [
        {
          id: "p1",
          team: { id: "t1", name: "Zeta", slug: "zeta" },
          players: [
            { id: "pl2", name: "Bravo", slug: "bravo" },
            { id: "pl1", name: "Alpha", slug: "alpha" },
          ],
        },
        {
          id: "p2",
          team: { id: "t1", name: "Zeta", slug: "zeta" },
          players: [],
        },
        {
          id: "p3",
          team: { id: "t2", name: "Alpha", slug: "alpha-team" },
          players: [{ id: "pl3", name: "Charlie", slug: "charlie" }],
        },
      ],
    } as Tournament;

    const entries = buildTournamentParticipantEntries(tournament);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.team.name).toBe("Alpha");
    expect(entries[1]?.team.name).toBe("Zeta");
    expect(entries[1]?.players.map((player) => player.name)).toEqual(["Alpha", "Bravo"]);
    expect(entries[1]?.hasReliableRoster).toBe(true);
  });
});
