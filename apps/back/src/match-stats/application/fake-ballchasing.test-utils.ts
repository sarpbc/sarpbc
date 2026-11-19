import type { ReplaySummary } from "../domain/replay-matching";
import type { BallchasingSource, ReplayStats } from "./ports";

export class FakeBallchasing implements BallchasingSource {
  readonly groupCalls: string[] = [];
  readonly statsCalls: string[] = [];
  readonly outcomes: Map<string, ReplayStats | Error | null>;
  groupFailure: Error | null = null;
  private readonly replays: ReplaySummary[];

  constructor(
    replays: ReplaySummary[] = [],
    outcomes = new Map<string, ReplayStats | Error | null>(),
  ) {
    this.replays = replays;
    this.outcomes = outcomes;
  }

  async groupReplays(groupId: string) {
    this.groupCalls.push(groupId);

    if (this.groupFailure) {
      throw this.groupFailure;
    }

    return this.replays;
  }

  async replayStats(replayId: string) {
    this.statsCalls.push(replayId);

    const outcome = this.outcomes.get(replayId);

    if (outcome === undefined) {
      throw new Error(`Unknown replay ${replayId}`);
    }

    if (outcome instanceof Error) {
      throw outcome;
    }

    return outcome;
  }
}
