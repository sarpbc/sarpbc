import { v4 } from "uuid";
import type { StatsImportFailedReason, StatsImportItem } from "@sarpbc/types";
import { ApplicationError, ConflictError } from "../../common/domain/errors";
import { parseBallchasingRef } from "../domain/ballchasing-ref";
import {
  assignReplays,
  byPlayedAt,
  type ReplayAssignment,
  type RosterPlayer,
} from "../domain/replay-matching";
import { isActive, type StatsImport } from "../domain/stats-import";
import {
  buildGameRecord,
  hasBothTeams,
  platformAccounts,
  requireBallchasing,
  requireTournament,
} from "./game-record";
import type {
  BallchasingSource,
  GameStatsStore,
  ReplayStats,
  StatsCandidates,
  StatsImportScheduler,
  StatsImportStore,
} from "./ports";

const RECENT_IMPORTS = 5;
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

  async request(tournamentId: string, group: string): Promise<StatsImport> {
    requireBallchasing(this.source);
    const groupId = parseBallchasingRef("group", group);
    await requireTournament(this.candidates, tournamentId);
    const [latest] = await this.imports.latest(tournamentId, 1);
    if (latest && isActive(latest))
      throw new ConflictError({
        message: "A stats import is already running for this tournament. Wait for it to finish.",
        code: "stats_import_running",
      });
    const statsImport: StatsImport = {
      id: v4(),
      tournamentId,
      groupId,
      status: "pending",
      total: null,
      processed: 0,
      items: [],
      error: null,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
    };
    await this.imports.create(statsImport);
    this.scheduler.schedule(() => this.run(statsImport.id));
    return statsImport;
  }

  recent(tournamentId: string): Promise<StatsImport[]> {
    return this.imports.latest(tournamentId, RECENT_IMPORTS);
  }

  failInterrupted(): Promise<number> {
    return this.imports.failUnfinished(INTERRUPTED_IMPORT_ERROR);
  }

  async run(importId: string): Promise<void> {
    const statsImport = await this.imports.load(importId);
    if (!statsImport || statsImport.status !== "pending" || !this.source) return;
    statsImport.status = "running";
    statsImport.startedAt = new Date();
    await this.imports.save(statsImport);

    try {
      const replays = await this.source.groupReplays(statsImport.groupId);
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
      const assignments = assignReplays(replays, matches, stored, excluded).sort((a, b) =>
        byPlayedAt(a.replay, b.replay),
      );
      statsImport.total = assignments.length;
      await this.imports.save(statsImport);

      for (const assignment of assignments) {
        statsImport.items.push(await this.process(this.source, assignment, rosters));
        statsImport.processed += 1;
        await this.imports.save(statsImport);
      }
      statsImport.status = "completed";
    } catch (error) {
      statsImport.status = "failed";
      statsImport.error =
        error instanceof ApplicationError
          ? error.message
          : "The import failed unexpectedly. Check the API logs, then run it again.";
      if (!(error instanceof ApplicationError)) this.reportFailure(error);
    }
    statsImport.finishedAt = new Date();
    await this.imports.save(statsImport);
  }

  private async process(
    source: BallchasingSource,
    assignment: ReplayAssignment,
    rosters: ReadonlyMap<string, RosterPlayer[]>,
  ): Promise<StatsImportItem> {
    const { replay } = assignment;
    const base = {
      replayId: replay.id,
      title: replay.title,
      playedAt: replay.playedAt?.toISOString() ?? null,
    };
    switch (assignment.kind) {
      case "unmatched":
        return {
          ...base,
          status: "unmatched",
          matchId: assignment.matchId,
          blueParticipantId: assignment.sides?.blue ?? null,
          reason: assignment.reason,
        };
      case "stored":
        return {
          ...base,
          status: "already_imported",
          matchId: assignment.matchId,
          gameNumber: assignment.gameNumber,
        };
      case "matched":
        break;
      default: {
        const exhaustive: never = assignment;
        return exhaustive;
      }
    }
    const target = { ...base, matchId: assignment.matchId, gameNumber: assignment.gameNumber };
    const failed = (reason: StatsImportFailedReason): StatsImportItem => ({
      ...target,
      blueParticipantId: assignment.sides.blue,
      status: "failed",
      reason,
    });

    let stats: ReplayStats | null;
    try {
      stats = await source.replayStats(replay.id);
    } catch (error) {
      this.reportFailure(error);
      return failed("fetch_failed");
    }
    if (!stats) return failed("replay_not_ready");

    if (stats.blueGoals !== replay.blue.goals || stats.orangeGoals !== replay.orange.goals)
      return failed("score_mismatch");
    if (!hasBothTeams(stats)) return failed("player_mismatch");

    try {
      const links = await this.games.links(platformAccounts(stats));
      await this.games.save(
        buildGameRecord(
          {
            matchId: assignment.matchId,
            number: assignment.gameNumber,
            ballchasingId: replay.id,
            rocketLeagueId: replay.rocketLeagueId,
            playedAt: replay.playedAt,
            sides: assignment.sides,
          },
          stats,
          rosters,
          links,
        ),
      );
    } catch (error) {
      this.reportFailure(error);
      return failed("save_failed");
    }
    return { ...target, status: "imported" };
  }
}
