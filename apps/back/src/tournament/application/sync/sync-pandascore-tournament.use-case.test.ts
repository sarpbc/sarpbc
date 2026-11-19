import { beforeEach, describe, expect, it } from "vitest";
import { Tournament } from "../../domain/tournament";
import type { UpsertTournamentCommand } from "../feed";
import { memoryFeed } from "../feed.test-utils";
import { RecordingCompetitionSync } from "./competition-sync.test-utils";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

const providerMatch = (name: string) => ({
  forfeit: false,
  name,
  officialStreams: [],
  opponentSlugs: [],
  pandascoreId: 7,
  previousMatches: [],
  results: [],
  tournamentPandascoreId: 42,
  winnerPandascoreTeamId: null,
});

describe(SyncPandascoreTournamentUseCase, () => {
  let feed: ReturnType<typeof memoryFeed>;
  let sync: RecordingCompetitionSync;
  let stored: Map<string, Tournament>;
  let useCase: SyncPandascoreTournamentUseCase;

  beforeEach(() => {
    feed = memoryFeed();
    sync = new RecordingCompetitionSync();
    stored = new Map([
      [
        "t1",
        Object.assign(new Tournament(), {
          hasBracket: false,
          id: "t1",
          pandascoreId: 42,
          source: "pandascore",
        }),
      ],
    ]);
    feed.standingsByTournament.set(42, [{ rank: 1, teamPandascoreId: 8 }]);
    useCase = new SyncPandascoreTournamentUseCase(
      feed,
      { findById: async (id) => stored.get(id) ?? null },
      sync,
    );
  });

  it.each([
    [true, "Bracket final"],
    [false, "Group match"],
  ])("imports the matches of the listing that fits hasBracket=%s", async (hasBracket, name) => {
    const command: UpsertTournamentCommand = { hasBracket, name: "Playoffs", pandascoreId: 42 };
    feed.tournamentsById.set(42, command);
    feed.bracketsByTournament.set(42, [providerMatch("Bracket final")]);
    feed.matchesByTournament.set(42, [providerMatch("Group match")]);
    await useCase.execute("t1");
    expect(sync.upserted).toStrictEqual([
      {
        command: { ...command, standings: [{ rank: 1, teamPandascoreId: 8 }] },
        linkTournamentId: undefined,
        matches: [providerMatch(name)],
      },
    ]);
  });

  it("leaves placements untouched when standings are unavailable", async () => {
    const command: UpsertTournamentCommand = { name: "Playoffs", pandascoreId: 42 };
    feed.tournamentsById.set(42, command);
    feed.standingsByTournament.delete(42);
    await useCase.execute("t1");
    expect(sync.upserted).toStrictEqual([{ command, linkTournamentId: undefined, matches: [] }]);
  });

  it("protects manual tournaments before fetching", async () => {
    stored.set("manual", Object.assign(new Tournament(), { id: "manual", source: "manual" }));
    await expect(useCase.execute("manual")).rejects.toThrow(
      "Cannot sync a manual tournament from PandaScore",
    );
    expect(feed.requestedTournaments).toStrictEqual([]);
  });

  it("reports a transient provider failure instead of a missing tournament", async () => {
    feed.failOn("getTournamentById", new Error("429 Too Many Requests"));
    await expect(useCase.executeByPandascoreId(42)).rejects.toThrow("429");
    await expect(useCase.execute("t1")).rejects.toThrow("429");
    expect(sync.upserted).toStrictEqual([]);
  });

  it("fetches all provider data before opening the write operation", async () => {
    feed.tournamentsById.set(42, { name: "Cup", pandascoreId: 42 });
    feed.failOn("getTournamentMatches", new Error("provider failed"));
    await expect(useCase.executeByPandascoreId(42)).rejects.toThrow("provider failed");
    expect(sync.upserted).toStrictEqual([]);
  });
});
