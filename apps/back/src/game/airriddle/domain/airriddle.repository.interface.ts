import { AirRiddle } from "./airriddle.entity";

export interface IAirRiddleRepository {
  findTodaysRiddle(todayStart: Date): Promise<AirRiddle | null>;
  save(riddle: AirRiddle): Promise<void>;
}
