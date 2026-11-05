import { v4 } from "uuid";
import type { StatsImportItem } from "@sarpbc/types";
import {
  ApplicationError,
  ConflictError,
  IntegrationError,
  NotFoundError,
} from "../../common/domain/errors";
import { parseBallchasingGroupId } from "../domain/group-ref";
import {
  assignReplays,
  resolvePlayerId,
  type ReplayAssignment,
  type RosterPlayer,
} from "../domain/replay-matching";
import { isActive, type StatsImport } from "../domain/stats-import";
import type {
  BallchasingSource,
  GameStatsStore,
  ReplayStats,
  StatsCandidates,
  StatsImportStore,
} from "./ports";

const RECENT_IMPORTS = 5;
export const INTERRUPTED_IMPORT_ERROR =
  "The import stopped when the API restarted. Run it again; games already imported are skipped.";

type Matched = Extract<ReplayAssignment, { kind: "matched" }>;

export class StatsImportService {
  constructor(
    private readonly source: BallchasingSource | null,
    private readonly candidates: StatsCandidates,
    private readonly games: GameStatsStore,
    private readonly imports: StatsImportStore,
    private readonly reportFailure: (error: unknown) => void,
  ) {}

  async request(tournamentId: string, group: string): Promise<StatsImport> {
    if (!this.source)
      throw new IntegrationError({
        message:
          "Ballchasing is not configured. Set BALLCHASING_API_KEY on the API and restart it.",
        code: "ballchasing_not_configured",
      });
    const groupId = parseBallchasingGroupId(group);
    if (!(await this.candidates.tournamentExists(tournamentId)))
      throw new NotFoundError("This tournament no longer exists. Reload the tournament list.");
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
      const imported = await this.games.importedReplayIds(replays.map((replay) => replay.id));
      const rosters = new Map(
        matches.flatMap((match) =>
          match.participants.map((participant) => [participant.id, participant.players] as const),
        ),
      );
      const assignments = assignReplays(replays, matches).sort(
        (a, b) =>
          (a.replay.playedAt?.getTime() ?? 0) - (b.replay.playedAt?.getTime() ?? 0) ||
          a.replay.id.localeCompare(b.replay.id),
      );
      statsImport.total = assignments.length;
      await this.imports.save(statsImport);

      for (const assignment of assignments) {
        statsImport.items.push(await this.process(this.source, assignment, imported, rosters));
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
    imported: Set<string>,
    rosters: Map<string, RosterPlayer[]>,
  ): Promise<StatsImportItem> {
    const { replay } = assignment;
    const base = {
      replayId: replay.id,
      title: replay.title,
      playedAt: replay.playedAt?.toISOString() ?? null,
    };
    if (assignment.kind === "unmatched")
      return {
        ...base,
        status: "unmatched",
        matchId: assignment.matchId,
        reason: assignment.reason,
      };
    const target = { ...base, matchId: assignment.matchId, gameNumber: assignment.gameNumber };
    if (imported.has(replay.id)) return { ...target, status: "already_imported" };

    let stats: ReplayStats | null;
    try {
      stats = await source.replayStats(replay.id);
    } catch (error) {
      this.reportFailure(error);
      return { ...target, status: "failed", reason: "fetch_failed" };
    }
    if (!stats) return { ...target, status: "failed", reason: "replay_not_ready" };

    if (stats.blueGoals !== replay.blue.goals || stats.orangeGoals !== replay.orange.goals)
      return { ...target, status: "failed", reason: "score_mismatch" };
    if (!(["blue", "orange"] as const).every((side) => stats.players.some((p) => p.side === side)))
      return { ...target, status: "failed", reason: "player_mismatch" };

    try {
      await this.games.save(this.record(assignment, stats, rosters));
    } catch (error) {
      this.reportFailure(error);
      return { ...target, status: "failed", reason: "save_failed" };
    }
    return { ...target, status: "imported" };
  }

  private record(
    { replay, matchId, gameNumber, sides }: Matched,
    stats: ReplayStats,
    rosters: Map<string, RosterPlayer[]>,
  ) {
    return {
      matchId,
      number: gameNumber,
      ballchasingId: replay.id,
      rocketLeagueId: replay.rocketLeagueId,
      playedAt: replay.playedAt,
      blueParticipantId: sides.blue,
      orangeParticipantId: sides.orange,
      blueGoals: stats.blueGoals,
      orangeGoals: stats.orangeGoals,
      players: stats.players.map((player) => ({
        ...player,
        playerId: resolvePlayerId(player.name, rosters.get(sides[player.side]) ?? []),
      })),
    };
  }
}
