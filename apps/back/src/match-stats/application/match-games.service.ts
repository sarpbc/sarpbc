import type { MatchGameStats } from "@sarpbc/types";
import type { GameStatsStore } from "./ports";

export class MatchGamesService {
  constructor(private readonly games: GameStatsStore) {}

  forMatch(matchId: string): Promise<MatchGameStats[]> {
    return this.games.byMatch(matchId);
  }
}
