import type { StatsImportScheduler } from "./ports";

export class RecordingScheduler implements StatsImportScheduler {
  readonly tasks: (() => Promise<void>)[] = [];

  schedule(task: () => Promise<void>) {
    this.tasks.push(task);
  }
}
