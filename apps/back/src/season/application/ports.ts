import type { PlayerSeasonAward, SeasonAward, SeasonSummary } from "@sarpbc/types";
import type { SeasonAwardFields } from "../domain/season-award";

export interface SeasonAwardPlayer {
  id: string;
  name: string;
  mergedIntoId: string | null;
}

export interface SeasonStore {
  list(): Promise<SeasonSummary[]>;
  find(id: string): Promise<SeasonSummary | null>;
  nameTaken(name: string, exceptId: string | null): Promise<boolean>;
  save(season: SeasonSummary): Promise<void>;
  remove(id: string): Promise<boolean>;
  awards(seasonId: string): Promise<SeasonAward[]>;
  awardsOfPlayer(playerId: string): Promise<PlayerSeasonAward[]>;
  player(id: string): Promise<SeasonAwardPlayer | null>;
  awardTaken(
    seasonId: string,
    award: Pick<SeasonAwardFields, "awardType" | "region">,
  ): Promise<boolean>;
  saveAward(seasonId: string, playerId: string, award: SeasonAwardFields): Promise<SeasonAward>;
  removeAward(seasonId: string, awardId: string): Promise<boolean>;
}
