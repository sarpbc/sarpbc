import { PickemChoice } from "./pickem.entity";

export interface IPickemRepository {
  find(tournamentId: string): Promise<PickemChoice[]>;
  findUserPicksForTournament(tournamentId: string, userId: string): Promise<PickemChoice[]>;
  findByUserAndMatch(userId: string, matchId: string): Promise<PickemChoice | null>;
  findUnscoredByMatch(matchId: string): Promise<PickemChoice[]>;
  findScoredByTournament(tournamentId: string): Promise<PickemChoice[]>;
  save(pick: PickemChoice): Promise<void>;
  saveMany(picks: PickemChoice[]): Promise<void>;
  flush(): Promise<void>;
}
