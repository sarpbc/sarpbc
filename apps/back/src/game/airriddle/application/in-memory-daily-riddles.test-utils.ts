import type { DailyRiddle } from "../domain/airriddle";
import type { DailyRiddles } from "./ports";

export class InMemoryDailyRiddles implements DailyRiddles {
  readonly saved: DailyRiddle[] = [];
  private current: DailyRiddle | null;
  private readonly saveFailure: Error | null;

  constructor(current: DailyRiddle | null = null, saveFailure: Error | null = null) {
    this.current = current;
    this.saveFailure = saveFailure;
  }

  async findTodaysRiddle() {
    return this.current;
  }

  async save(riddle: DailyRiddle) {
    if (this.saveFailure) {
      throw this.saveFailure;
    }

    this.saved.push(riddle);
    this.current = riddle;
  }
}
