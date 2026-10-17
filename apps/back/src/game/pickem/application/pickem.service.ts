import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { assertPickAllowed, derivePickWinner, scorePick } from "../domain/pickem";
import type {
  PickemReads,
  PickemTransaction,
  PickemRuntime,
  UserPickDto,
  LeaderboardEntryDto,
  PersonalRankingDto,
} from "./ports";
export class PickemService {
  constructor(
    private readonly reads: PickemReads,
    private readonly transaction: PickemTransaction,
    private readonly runtime: PickemRuntime,
  ) {}
  listByTournament(tournamentId: string) {
    return this.reads.list(tournamentId);
  }
  async getUserPicksForTournament(tournamentId: string, userId: string): Promise<UserPickDto[]> {
    return (await this.reads.list(tournamentId, userId)).map((p) => ({
      match: p.match.id,
      pickedParticipant: p.pickedParticipant.id,
      points: p.points,
      scored: p.scored,
    }));
  }
  async makePick(userId: string, matchId: string, participantId: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      if (!(await scope.userExists(userId)))
        throw new NotFoundError("User not found. Sign in and try again.");
      const match = await scope.match(matchId);
      if (!match) throw new NotFoundError("Match not found. Refresh the page and try again.");
      if (!(await scope.participantExists(participantId)))
        throw new NotFoundError("Participant not found. Refresh the page and try again.");
      const existing = await scope.pick(userId, matchId);
      assertPickAllowed(match, participantId, this.runtime.now(), existing?.scored ?? false);
      const pick = existing ?? {
        id: this.runtime.id(),
        user: { id: userId, userName: "" },
        match: { id: matchId },
        pickedParticipant: { id: participantId },
        points: null,
        scored: false,
        createdAt: this.runtime.now(),
      };
      pick.pickedParticipant = { id: participantId };
      await scope.savePick(pick);
    });
  }
  async validateMatchResult(matchId: string): Promise<{ updated: number }> {
    return this.transaction.run(async (scope) => {
      const match = await scope.match(matchId);
      if (!match) throw new NotFoundError(`Match #${matchId} not found`);
      const winner = derivePickWinner(match);
      if (!winner)
        throw new InvalidInputError(
          "Match has no winner set yet. Wait for the series result and try again.",
        );
      if (!match.winnerId) await scope.setWinner(matchId, winner);
      const picks = await scope.unscored(matchId);
      for (const pick of picks) {
        scorePick(pick, winner);
        await scope.savePick(pick);
      }
      return { updated: picks.length };
    });
  }
  async autoScoreMatch(matchId: string): Promise<void> {
    try {
      await this.validateMatchResult(matchId);
    } catch (error) {
      this.runtime.warn(
        `Auto-score skipped for match ${matchId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  tryValidateMatchResult(matchId: string): Promise<void> {
    return this.autoScoreMatch(matchId);
  }
  async leaderboard(tournamentId: string): Promise<LeaderboardEntryDto[]> {
    const entries = new Map<string, LeaderboardEntryDto>();
    for (const pick of await this.reads.list(tournamentId, undefined, true)) {
      const entry = entries.get(pick.user.id) ?? {
        userId: pick.user.id,
        userName: pick.user.userName,
        points: 0,
      };
      entry.points += pick.points ?? 0;
      entries.set(entry.userId, entry);
    }
    return [...entries.values()].sort((a, b) => b.points - a.points);
  }
  async personalRanking(tournamentId: string, userId: string): Promise<PersonalRankingDto> {
    const entries = await this.leaderboard(tournamentId),
      index = entries.findIndex((e) => e.userId === userId);
    return {
      rank: index < 0 ? null : index + 1,
      total: entries.length,
      points: entries[index]?.points ?? 0,
    };
  }
}
