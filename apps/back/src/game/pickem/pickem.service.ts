import { InjectRepository } from "@mikro-orm/nestjs";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { Match, TournamentParticipant } from "../../tournament/tournament.entities";
import { User } from "../../user/domain/user.entity";
import { PickemChoice } from "./domain/pickem.entity";
import { PickemRepository } from "./pickem.repository";
import type {
  LeaderboardEntryDto,
  PersonalRankingDto,
  UserPickDto,
} from "./dto/pickem-response.dto";
import {
  deriveWinnerParticipantId,
  findParticipantById,
} from "../../tournament/match/derive-match-winner";

@Injectable()
export class PickemService {
  private readonly logger = new Logger(PickemService.name);

  constructor(
    @InjectRepository(PickemChoice)
    private readonly pickemRepository: PickemRepository,
    private readonly em: EntityManager,
  ) {}

  async listByTournament(tournamentId: string) {
    return this.pickemRepository.findByTournament(tournamentId);
  }

  async getUserPicksForTournament(tournamentId: string, userId: string): Promise<UserPickDto[]> {
    const picks = await this.pickemRepository.findUserPicksForTournament(tournamentId, userId);
    return picks.map((pick) => ({
      match: pick.match.id,
      pickedParticipant: pick.pickedParticipant.id,
      points: pick.points,
      scored: pick.scored,
    }));
  }

  async makePick(userId: string, matchId: string, participantId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId });
    const match = await this.em.findOne(
      Match,
      { id: matchId },
      { populate: ["participants", "tournament"] },
    );
    const participant = await this.em.findOne(TournamentParticipant, {
      id: participantId,
    });

    if (!user) {
      throw new NotFoundException("User not found. Sign in and try again.");
    }
    if (!match) {
      throw new NotFoundException("Match not found. Refresh the page and try again.");
    }
    if (!participant) {
      throw new NotFoundException("Participant not found. Refresh the page and try again.");
    }

    if (!match.tournament?.pickemsEnabled) {
      throw new BadRequestException(
        "Pick'ems are not enabled for this tournament. Choose another tournament.",
      );
    }

    const now = new Date();
    if (match.beginAt && match.beginAt <= now) {
      throw new BadRequestException(
        "This match has already started. Picks are locked for this series.",
      );
    }

    if (match.endAt || match.status === "finished") {
      throw new BadRequestException("This match is finished. Picks are locked.");
    }

    const isInMatch = match.participants.getItems().some((p) => p.id === participantId);
    if (!isInMatch) {
      throw new BadRequestException(
        "That team is not part of this match. Refresh the page and try again.",
      );
    }

    let pick = await this.pickemRepository.findByUserAndMatch(userId, matchId);
    if (!pick) {
      pick = new PickemChoice();
      pick.user = user;
      pick.match = match;
      pick.pickedParticipant = participant;
    } else {
      if (pick.scored) {
        throw new BadRequestException("This pick has already been scored and cannot be changed.");
      }
      pick.pickedParticipant = participant;
    }

    await this.pickemRepository.save(pick);
  }

  /**
   * Score unscored picks for a finished match. Idempotent via `scored`.
   * Derives and persists winner from results when the relation is missing.
   */
  async validateMatchResult(matchId: string): Promise<{ updated: number }> {
    const match = await this.em.findOne(
      Match,
      { id: matchId },
      { populate: ["winner", "participants", "results", "results.participant"] },
    );
    if (!match) {
      throw new NotFoundException(`Match #${matchId} not found`);
    }

    if (!match.winner) {
      const derivedId = deriveWinnerParticipantId(
        match.results.getItems().map((r) => ({
          participantId: r.participant.id,
          score: r.score,
        })),
      );
      if (derivedId) {
        const winner = findParticipantById(match.participants.getItems(), derivedId);
        if (winner) {
          match.winner = winner;
          if (!match.status) {
            match.status = "finished";
          }
          await this.em.flush();
        }
      }
    }

    if (!match.winner) {
      throw new BadRequestException(
        "Match has no winner set yet. Wait for the series result and try again.",
      );
    }

    const picks = await this.pickemRepository.findUnscoredByMatch(matchId);

    for (const pick of picks) {
      if (pick.pickedParticipant.id === match.winner.id) {
        pick.points = 5;
      } else {
        pick.points = 0;
      }
      pick.scored = true;
    }

    await this.pickemRepository.flush();
    return { updated: picks.length };
  }

  /**
   * Best-effort auto-score after a match finishes. Never throws to callers.
   */
  async tryValidateMatchResult(matchId: string): Promise<void> {
    try {
      await this.validateMatchResult(matchId);
    } catch (error) {
      this.logger.warn(
        `Auto-score skipped for match ${matchId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async leaderboard(tournamentId: string): Promise<LeaderboardEntryDto[]> {
    const picks = await this.pickemRepository.findScoredByTournament(tournamentId);

    const map = new Map<string, LeaderboardEntryDto>();
    for (const p of picks) {
      const uid = p.user.id;
      const prev = map.get(uid) || {
        userId: uid,
        userName: p.user.userName,
        points: 0,
      };
      prev.points += p.points ?? 0;
      map.set(uid, prev);
    }

    return Array.from(map.values()).sort((a, b) => b.points - a.points);
  }

  async personalRanking(tournamentId: string, userId: string): Promise<PersonalRankingDto> {
    const leaderboard = await this.leaderboard(tournamentId);
    const index = leaderboard.findIndex((l) => l.userId === userId);
    const entry = index >= 0 ? leaderboard[index] : null;
    return {
      rank: index >= 0 ? index + 1 : null,
      total: leaderboard.length,
      points: entry?.points ?? 0,
    };
  }
}
