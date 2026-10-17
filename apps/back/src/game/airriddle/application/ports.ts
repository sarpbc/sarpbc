import type { DailyRiddle } from "../domain/airriddle";
export interface DailyRiddles {
  findTodaysRiddle(start: Date): Promise<DailyRiddle | null>;
  save(riddle: DailyRiddle): Promise<void>;
}
export interface RiddlePlayers {
  getRandomPlayer(): Promise<{ id: string; name: string } | null>;
  find(options: { name: string }): Promise<{ name: string }[]>;
}
export interface RiddleRuntime {
  dayStart(): Date;
  now(): Date;
  id(): string;
  skipped(reason: string): void;
  error(error: Error): void;
}
