import { matchDecided } from "../domain/match-decided";
import type { CompetitionCache, CompetitionDiagnostics, CompetitionEvents } from "./ports";

export interface CompetitionSettlement {
  tournamentIds?: readonly string[];
  decidedMatchIds?: readonly string[];
}

/** Optional work after a committed write: a failure is reported and never undoes the write. */
export class CompetitionAfterCommit {
  constructor(
    private readonly cache: CompetitionCache,
    private readonly events: CompetitionEvents,
    private readonly diagnostics: Pick<CompetitionDiagnostics, "error">,
  ) {}
  async settle({ tournamentIds = [], decidedMatchIds = [] }: CompetitionSettlement): Promise<void> {
    for (const id of new Set(tournamentIds)) {
      try {
        await this.cache.invalidateTournament(id);
      } catch (error) {
        this.diagnostics.error("Tournament cache invalidation failed", error);
      }
    }

    for (const matchId of new Set(decidedMatchIds)) {
      try {
        await this.events.publish(matchDecided(matchId));
      } catch (error) {
        this.diagnostics.error("MatchDecided publication failed", error);
      }
    }
  }
}
