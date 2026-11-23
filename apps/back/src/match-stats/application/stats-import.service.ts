import { v4 } from "uuid";
import type { StatsImportFailedReason, StatsImportItem } from "@sarpbc/types";
import { mapSequentially } from "../../common/application/sequentially";
import { ApplicationError } from "../../common/domain/errors/application-error";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { parseBallchasingRef } from "../domain/ballchasing-ref";
import { assignReplays, byPlayedAt, firstReplay } from "../domain/replay-matching";
import type {
  GameSegment,
  ReplayAssignment,
  ReplaySummary,
  RosterPlayer,
} from "../domain/replay-matching";
import { isActive } from "../domain/stats-import";
import type { StatsImport } from "../domain/stats-import";
import {
  buildGameRecord,
  hasBothTeams,
  platformAccounts,
  requireBallchasing,
  requireTournament,
} from "./game-record";
import type { ReplaySegment } from "./game-record";
import type {
  BallchasingSource,
  GameStatsStore,
  StatsCandidates,
  StatsImportScheduler,
  StatsImportStore,
} from "./ports";

const RECENT_IMPORTS = 5;

type MatchedGame = Extract<ReplayAssignment, { kind: "matched" }>;

const itemBase = (replay: ReplaySummary) => ({
  playedAt: replay.playedAt?.toISOString() ?? null,
  replayId: replay.id,
  title: replay.title,
});

// WARNING: a restarted replay's list score carries the goals of the game's earlier replays; its stats count only its own.
const scoresAgree = (segments: readonly GameSegment[], fetched: readonly ReplaySegment[]) => {
  const goals = new Map<string, number>();

  return segments.every(({ replay, sides }, index) => {
    const { stats } = fetched[index];
    goals.set(sides.blue, (goals.get(sides.blue) ?? 0) + stats.blueGoals);
    goals.set(sides.orange, (goals.get(sides.orange) ?? 0) + stats.orangeGoals);

    return (
      goals.get(sides.blue) === replay.blue.goals && goals.get(sides.orange) === replay.orange.goals
    );
  });
};

export const INTERRUPTED_IMPORT_ERROR =
  "The import stopped when the API restarted. Run it again; games already imported are skipped.";

export class StatsImportService {
  constructor(
    private readonly source: BallchasingSource | null,
    private readonly candidates: StatsCandidates,
    private readonly games: GameStatsStore,
    private readonly imports: StatsImportStore,
    private readonly scheduler: StatsImportScheduler,
    private readonly reportFailure: (cause: unknown) => void,
  ) {}

  async request(tournamentId: string, group: string) {
    requireBallchasing(this.source);
    const groupId = parseBallchasingRef("group", group);
    await requireTournament(this.candidates, tournamentId);
    const [latest]: (StatsImport | undefined)[] = await this.imports.latest(tournamentId, 1);

    if (latest !== undefined && isActive(latest)) {
      throw new ConflictError({
        code: "stats_import_running",
        message: "A stats import is already running for this tournament. Wait for it to finish.",
      });
    }

    const statsImport: StatsImport = {
      createdAt: new Date(),
      error: null,
      finishedAt: null,
      groupId,
      id: v4(),
      items: [],
      processed: 0,
      startedAt: null,
      status: "pending",
      total: null,
      tournamentId,
    };

    await this.imports.create(statsImport);
    this.scheduler.schedule(async () => {
      await this.run(statsImport.id);
    });

    return statsImport;
  }

  async recent(tournamentId: string) {
    return await this.imports.latest(tournamentId, RECENT_IMPORTS);
  }

  async failInterrupted() {
    return await this.imports.failUnfinished(INTERRUPTED_IMPORT_ERROR);
  }

  async run(importId: string) {
    const statsImport = await this.imports.load(importId);

    const { source } = this;

    if (!statsImport || statsImport.status !== "pending" || !source) {
      return;
    }

    statsImport.status = "running";
    statsImport.startedAt = new Date();
    await this.imports.save(statsImport);

    try {
      const replays = await source.groupReplays(statsImport.groupId);
      const matches = await this.candidates.matches(statsImport.tournamentId);
      const replayIds = replays.map((replay) => replay.id);

      const [stored, excluded] = await Promise.all([
        this.games.locations(replayIds),
        this.games.excluded(replayIds),
      ]);

      const rosters = new Map(
        matches.flatMap((match) =>
          match.participants.map((participant) => [participant.id, participant.players] as const),
        ),
      );

      const assignments = assignReplays(replays, matches, stored, excluded).toSorted((a, b) =>
        byPlayedAt(firstReplay(a), firstReplay(b)),
      );

      statsImport.total = replays.length;
      await this.imports.save(statsImport);

      // WARNING: one game at a time; the import record is saved after each and Ballchasing is rate limited.
      await mapSequentially(assignments, async (assignment) => {
        const items = await this.process(source, assignment, rosters);
        statsImport.items.push(...items);
        statsImport.processed += items.length;
        await this.imports.save(statsImport);
      });

      statsImport.status = "completed";
    } catch (error) {
      statsImport.status = "failed";
      statsImport.error =
        error instanceof ApplicationError
          ? error.message
          : "The import failed unexpectedly. Check the API logs, then run it again.";

      if (!(error instanceof ApplicationError)) {
        this.reportFailure(error);
      }
    }

    statsImport.finishedAt = new Date();
    await this.imports.save(statsImport);
  }

  private async process(
    source: BallchasingSource,
    assignment: ReplayAssignment,
    rosters: ReadonlyMap<string, RosterPlayer[]>,
  ) {
    switch (assignment.kind) {
      case "unmatched": {
        return [
          {
            ...itemBase(assignment.replay),
            blueParticipantId: assignment.sides?.blue ?? null,
            matchId: assignment.matchId,
            reason: assignment.reason,
            status: "unmatched",
          },
        ] satisfies StatsImportItem[];
      }

      case "stored": {
        return [
          {
            ...itemBase(assignment.replay),
            gameNumber: assignment.gameNumber,
            matchId: assignment.matchId,
            status: "already_imported",
          },
        ] satisfies StatsImportItem[];
      }

      case "matched": {
        const outcome = await this.importGame(source, assignment, rosters);
        const target = { gameNumber: assignment.gameNumber, matchId: assignment.matchId };

        return assignment.segments.map(({ replay, sides }) =>
          outcome === null
            ? ({ ...itemBase(replay), ...target, status: "imported" } satisfies StatsImportItem)
            : ({
                ...itemBase(replay),
                ...target,
                blueParticipantId: sides.blue,
                reason: outcome,
                status: "failed",
              } satisfies StatsImportItem),
        );
      }

      default: {
        const exhaustive: never = assignment;

        return exhaustive satisfies StatsImportItem[];
      }
    }
  }

  private async importGame(
    source: BallchasingSource,
    { matchId, gameNumber, segments }: MatchedGame,
    rosters: ReadonlyMap<string, RosterPlayer[]>,
  ) {
    // WARNING: one replay at a time; Ballchasing is rate limited.
    const details = await mapSequentially(segments, async ({ replay }) => {
      try {
        return await source.replayStats(replay.id);
      } catch (error) {
        this.reportFailure(error);

        return "fetch_failed" as const;
      }
    });

    if (details.includes("fetch_failed")) {
      return "fetch_failed" satisfies StatsImportFailedReason;
    }

    const fetched = segments.flatMap(({ replay, sides }, index) => {
      const stats = details[index];

      return stats === null || stats === "fetch_failed"
        ? []
        : [
            {
              stats,
              target: {
                ballchasingId: replay.id,
                playedAt: replay.playedAt,
                rocketLeagueId: replay.rocketLeagueId,
                sides,
              },
            } satisfies ReplaySegment,
          ];
    });

    if (fetched.length < segments.length) {
      return "replay_not_ready" satisfies StatsImportFailedReason;
    }

    if (!scoresAgree(segments, fetched)) {
      return "score_mismatch" satisfies StatsImportFailedReason;
    }

    if (!fetched.every(({ stats }) => hasBothTeams(stats))) {
      return "player_mismatch" satisfies StatsImportFailedReason;
    }

    try {
      const links = await this.games.links(fetched.flatMap(({ stats }) => platformAccounts(stats)));

      await this.games.save(
        buildGameRecord(
          { matchId, number: gameNumber, sides: segments[0].sides },
          fetched,
          rosters,
          links,
        ),
      );
    } catch (error) {
      this.reportFailure(error);

      return "save_failed" satisfies StatsImportFailedReason;
    }

    return null satisfies StatsImportFailedReason | null;
  }
}
