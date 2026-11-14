import { mapSequentially } from "../../../common/application/sequentially";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { assertPickAllowed, derivePickWinner, scorePick } from "../domain/pickem";
import type {
  PickemMatches,
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
    private readonly matches: PickemMatches,
    private readonly transaction: PickemTransaction,
    private readonly runtime: PickemRuntime,
  ) {}
  async getUserPicksForTournament(tournamentId: string, userId: string): Promise<UserPickDto[]> {
    const picks = await this.reads.list(tournamentId, { userId });

    return picks.map((p) => ({
      match: p.match.id,
      pickedParticipant: p.pickedParticipant.id,
      points: p.points,
      scored: p.scored,
    }));
  }
  async makePick(userId: string, matchId: string, participantId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      if (!(await scope.userExists(userId))) {
        throw new NotFoundError("User not found. Sign in and try again.");
      }

      const existing = await scope.pick(userId, matchId);
      const match = await this.matches.find(matchId);

      if (!match) {
        throw new NotFoundError("Match not found. Refresh the page and try again.");
      }

      if (!(await scope.participantExists(participantId))) {
        throw new NotFoundError("Participant not found. Refresh the page and try again.");
      }

      assertPickAllowed(match, participantId, this.runtime.now(), existing?.scored ?? false);
      await scope.savePick({
        id: this.runtime.id(),
        user: { id: userId },
        match: { id: matchId },
        points: null,
        scored: false,
        createdAt: this.runtime.now(),
        ...existing,
        pickedParticipant: { id: participantId },
      });
    });
  }
  async validateMatchResult(matchId: string): Promise<{ updated: number }> {
    const match = await this.matches.find(matchId);

    if (!match) {
      throw new NotFoundError(`Match #${matchId} not found`);
    }

    const winner = derivePickWinner(match);

    if (winner === null || winner === "") {
      throw new InvalidInputError(
        "Match has no winner set yet. Wait for the series result and try again.",
      );
    }

    if (match.winnerId === null || match.winnerId === "") {
      await this.matches.decide(matchId, winner);
    }

    return await this.transaction.run(async (scope) => {
      const picks = await scope.unscored(matchId);

      for (const pick of picks) {
        scorePick(pick, winner);
      }

      await mapSequentially(picks, async (pick) => {
        await scope.savePick(pick);
      });

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
  async leaderboard(tournamentId: string): Promise<LeaderboardEntryDto[]> {
    const entries = new Map<string, LeaderboardEntryDto>();

    const scoredPicks = await this.reads.list(tournamentId, { scoredOnly: true });

    for (const pick of scoredPicks) {
      const entry = entries.get(pick.user.id) ?? {
        userId: pick.user.id,
        userName: pick.user.userName,
        points: 0,
      };

      entry.points += pick.points ?? 0;
      entries.set(entry.userId, entry);
    }

    return [...entries.values()].toSorted((a, b) => b.points - a.points);
  }
  async personalRanking(tournamentId: string, userId: string): Promise<PersonalRankingDto> {
    const entries = await this.leaderboard(tournamentId);
    const index = entries.findIndex((e) => e.userId === userId);

    return {
      rank: index === -1 ? null : index + 1,
      total: entries.length,
      points: entries[index]?.points ?? 0,
    };
  }
}
