import type { MatchService } from "../../../tournament/application/match/match.service";
import type { PickemMatches } from "../application/ports";

export class CompetitionPickemMatches implements PickemMatches {
  constructor(private readonly matches: Pick<MatchService, "find" | "setMatchWinner">) {}
  async find(id: string) {
    const match = await this.matches.find(id);

    return match
      ? {
          beginAt: match.beginAt,
          endAt: match.endAt,
          id: match.id,
          participantIds: match.participants.map((p) => p.id),
          pickemsEnabled: match.tournament.pickemsEnabled,
          results: match.results.map((r) => ({ participantId: r.participant.id, score: r.score })),
          status: match.status,
          winnerId: match.winner?.id ?? null,
        }
      : null;
  }
  async decide(matchId: string, winnerId: string) {
    await this.matches.setMatchWinner(matchId, winnerId);
  }
}
