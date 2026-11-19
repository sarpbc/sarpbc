import { beforeEach, describe, expect, it } from "vitest";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { matchQueries, tournamentQueries } from "../../../../test/competition-doubles";
import { unconstructed } from "../../../../test/doubles";
import { TournamentSyncRunner } from "./tournament-sync.runner";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { RecordingCompetitionSync } from "../../application/sync/competition-sync.test-utils";
import { memoryFeed } from "../../application/feed.test-utils";
import {
  recordingCache,
  recordingDiagnostics,
  recordingEvents,
  transactionOver,
} from "../../application/ports.test-utils";
import { CompetitionAfterCommit } from "../../application/after-commit";
import { MatchService } from "../../application/match/match.service";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TOURNAMENT_QUERIES } from "../competition-queries.tokens";

const matchIn = (tournamentId: string) =>
  Object.assign(new Match(), {
    tournament: Object.assign(new Tournament(), { id: tournamentId }),
  });

describe(TournamentSyncRunner, () => {
  let cron: TournamentSyncRunner;
  let feed: ReturnType<typeof memoryFeed>;
  let sync: RecordingCompetitionSync;
  let liveMatches: Match[];
  let activeTournaments: { id: string }[];

  const stored = new Map(
    ["tournament-1", "tournament-2", "empty-playoffs"].map((id, index) => [
      id,
      Object.assign(new Tournament(), { id, pandascoreId: index + 1, source: "pandascore" }),
    ]),
  );

  beforeEach(async () => {
    feed = memoryFeed();
    sync = new RecordingCompetitionSync();
    liveMatches = [];
    activeTournaments = [];

    for (const { pandascoreId } of stored.values()) {
      feed.tournamentsById.set(pandascoreId, { name: `Tournament ${pandascoreId}`, pandascoreId });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentSyncRunner,
        { provide: SyncNewTournamentsUseCase, useValue: unconstructed(SyncNewTournamentsUseCase) },
        {
          provide: SyncPandascoreTournamentUseCase,
          useValue: new SyncPandascoreTournamentUseCase(
            feed,
            { findById: async (id) => stored.get(id) ?? null },
            sync,
          ),
        },
        {
          provide: MatchService,
          useValue: new MatchService(
            matchQueries({
              list: async () => [liveMatches, liveMatches.length],
              recentlyEnded: async () => [],
            }),
            transactionOver({}),
            new CompetitionAfterCommit(recordingCache(), recordingEvents(), recordingDiagnostics()),
          ),
        },
        {
          provide: TOURNAMENT_QUERIES,
          useValue: tournamentQueries({ findPandascoreActive: async () => activeTournaments }),
        },
      ],
    }).compile();

    cron = module.get(TournamentSyncRunner);
  });

  it("syncActiveTournaments syncs tournaments with live matches", async () => {
    liveMatches = [matchIn("tournament-1")];

    await cron.syncActiveTournaments();

    expect(sync.upserted.map(({ command }) => command.pandascoreId)).toStrictEqual([1]);
  });

  it("syncActiveTournaments syncs active tournaments that have no match yet", async () => {
    activeTournaments = [{ id: "empty-playoffs" }];

    await cron.syncActiveTournaments();

    expect(sync.upserted.map(({ command }) => command.pandascoreId)).toStrictEqual([3]);
  });

  it("syncActiveTournaments syncs each tournament once and continues after a failure", async () => {
    activeTournaments = [{ id: "tournament-1" }, { id: "tournament-2" }];
    liveMatches = [matchIn("tournament-1")];
    sync.outcomes = [new Error("PandaScore down"), null];

    await cron.syncActiveTournaments();

    expect(feed.requestedTournaments).toStrictEqual([1, 2]);
    expect(sync.upserted.map(({ command }) => command.pandascoreId)).toStrictEqual([2]);
  });
});
