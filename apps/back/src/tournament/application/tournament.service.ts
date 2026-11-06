import type { TournamentQueries } from "./ports";
export class TournamentService {
  constructor(private readonly reads: TournamentQueries) {}
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
