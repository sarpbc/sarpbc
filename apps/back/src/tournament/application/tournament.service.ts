import { NotFoundError } from "../../common/domain/errors";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionTransaction,
  TournamentQueries,
} from "./ports";
import type { TournamentListOptions } from "./inputs";
import { SyncAllTournamentsUseCase } from "./sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { SyncNewTournamentsUseCase } from "./sync/sync-new-tournaments.use-case";
export class TournamentService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly all: SyncAllTournamentsUseCase,
    private readonly details: SyncPandascoreTournamentUseCase,
    private readonly additions: SyncNewTournamentsUseCase,
    private readonly cache: CompetitionCache,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}
  find(options: TournamentListOptions = {}) {
    return this.reads.find(options);
  }
  searchByName(options: { name: string; limit?: number; offset?: number }) {
    return this.reads.searchByName(options);
  }
  findById(id: string) {
    return this.reads.findById(id);
  }
  findPandascoreWithoutMatches() {
    return this.reads.findPandascoreWithoutMatches();
  }
  async findPandascoreActiveIds(now = new Date()): Promise<string[]> {
    const hour = 60 * 60 * 1000;
    return (
      await this.reads.findPandascoreActive({
        beginsBefore: new Date(now.getTime() + 24 * hour),
        beganAfter: new Date(now.getTime() - 7 * 24 * hour),
        endsAfter: new Date(now.getTime() - 6 * hour),
      })
    ).map((t) => t.id);
  }
  async setTournamentPickemsEnabled(id: string, enabled: boolean): Promise<void> {
    await this.transaction.run(async ({ tournaments }) => {
      const t = await tournaments.load(id);
      if (!t) throw new NotFoundError("Tournament not found");
      t.pickemsEnabled = enabled;
      await tournaments.save(t);
    });
    try {
      await this.cache.invalidateTournament(id);
    } catch (error) {
      this.diagnostics.error("Tournament cache invalidation failed", error);
    }
  }
  async syncAllTournaments(): Promise<void> {
    await this.all.execute();
  }
  async syncTournamentFromPandascore(id: string): Promise<void> {
    await this.details.execute(id);
  }
  syncTournamentByPandascoreId(id: number) {
    return this.details.executeByPandascoreId(id);
  }
  linkPandascoreTournament(tournamentId: string, pandascoreId: number) {
    return this.details.executeByPandascoreId(pandascoreId, tournamentId);
  }
  syncNewTournamentsFromPandascore() {
    return this.additions.execute();
  }
  getTournamentsByPlayer(id: string) {
    return this.reads.getTournamentsByPlayer(id);
  }
  getTournamentsByTeam(id: string) {
    return this.reads.getTournamentsByTeam(id);
  }
  getTournamentsWonByPlayer(id: string) {
    return this.reads.getTournamentsWonByPlayer(id);
  }
  getTournamentsWonByTeam(id: string) {
    return this.reads.getTournamentsWonByTeam(id);
  }
}
