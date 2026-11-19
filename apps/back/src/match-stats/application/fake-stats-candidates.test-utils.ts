import type { CandidateMatch } from "../domain/replay-matching";
import type { StatsCandidates } from "./ports";

export class FakeStatsCandidates implements StatsCandidates {
  private readonly matchesOf: () => CandidateMatch[];
  private readonly tournamentIds: string[];

  constructor(matchesOf: () => CandidateMatch[], tournamentIds: string[] = ["t1"]) {
    this.matchesOf = matchesOf;
    this.tournamentIds = tournamentIds;
  }

  async tournamentExists(tournamentId: string) {
    return this.tournamentIds.includes(tournamentId);
  }

  async matches() {
    return this.matchesOf();
  }
}
