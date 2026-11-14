import type { MatchService } from "../../../tournament/application/match/match.service";
import type { PickemMatches } from "../application/ports";

export class CompetitionPickemMatches implements PickemMatches {
  constructor(private readonly matches: Pick<MatchService, "find" | "setMatchWinner">) {}
  async find(id: string) {
    const match = await this.matches.find(id);

    return match
      ? {
          id: match.id,
          pickemsEnabled: match.tournament.pickemsEnabled,
          beginAt: match.beginAt,
          endAt: match.endAt,
          status: match.status,
          participantIds: match.participants.map((p) => p.id),
          winnerId: match.winner?.id ?? null,
          results: match.results.map((r) => ({ participantId: r.participant.id, score: r.score })),
        }
      : null;
  }
  async decide(matchId: string, winnerId: string) {
    await this.matches.setMatchWinner(matchId, winnerId);
  }
}
