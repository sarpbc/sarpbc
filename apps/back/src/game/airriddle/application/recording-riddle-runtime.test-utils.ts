import type { RiddleRuntime } from "./ports";

export class RecordingRiddleRuntime implements RiddleRuntime {
  skippedCount = 0;
  readonly errors: Error[] = [];

  dayStart() {
    return new Date("2026-10-14T22:00:00Z");
  }

  now() {
    return new Date("2026-10-15T12:00:00Z");
  }

  id() {
    return "riddle-1";
  }

  skipped() {
    this.skippedCount += 1;
  }

  error(error: Error) {
    this.errors.push(error);
  }
}
