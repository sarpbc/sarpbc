import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import { TournamentParticipant } from "../../tournament/domain/tournament-participant.entity";
import { User } from "../../user/domain/user.entity";
import { PickemChoice } from "./domain/pickem.entity";
import { PickemRepository } from "./pickem.repository";
import { Match } from "src/tournament/match/match.entity";

@Injectable()
export class PickemService {
  constructor(
    private readonly pickemRepository: PickemRepository,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Match)
    private readonly matchRepository: EntityRepository<Match>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
  ) {}

  async listByTournament(tournamentId: string) {
    return this.pickemRepository.findByTournament(tournamentId);
  }

  async getUserPicksForTournament(tournamentId: string, userId: string) {
    const picks = await this.pickemRepository.findUserPicksForTournament(tournamentId, userId);
    return picks.map((pick) => ({
      match: pick.match.id,
      pickedParticipant: pick.pickedParticipant.id,
    }));
  }

  async makePick(userId: string, matchId: string, participantId: string) {
    const user = await this.userRepository.findOne({ id: userId });
    const match = await this.matchRepository.findOne(
      { id: matchId },
      { populate: ["participants"] },
    );
    const participant = await this.participantRepository.findOne({
      id: participantId,
    });

    if (!user || !match || !participant) {
      throw new Error("Invalid user/match/participant");
    }

    const now = new Date();
    if (match.beginAt && match.beginAt <= now) {
      throw new Error("Match has already started");
    }

    const isInMatch = match.participants.getItems().some((p) => p.id === participantId);
    if (!isInMatch) {
      throw new Error("Participant is not part of the match");
    }

    let pick = await this.pickemRepository.findByUserAndMatch(userId, matchId);
    if (!pick) {
      pick = new PickemChoice();
      pick.user = user;
      pick.match = match;
      pick.pickedParticipant = participant;
    } else {
      pick.pickedParticipant = participant;
    }

    await this.pickemRepository.save(pick);
  }

  async validateMatchResult(matchId: string) {
    const match = await this.matchRepository.findOne({ id: matchId }, { populate: ["winner"] });
    if (!match) {
      throw new Error("Match not found");
    }

    if (!match.winner) {
      throw new Error("Match has no winner set");
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

  async leaderboard(tournamentId: string) {
    const picks = await this.pickemRepository.findScoredByTournament(tournamentId);

    const map = new Map<string, { user: User; points: number }>();
    for (const p of picks) {
      const uid = p.user.id;
      const prev = map.get(uid) || { user: p.user, points: 0 };
      prev.points += p.points ?? 0;
      map.set(uid, prev);
    }

    const arr = Array.from(map.values()).sort((a, b) => b.points - a.points);
    return arr;
  }

  async personalRanking(tournamentId: string, userId: string) {
    const leaderboard = await this.leaderboard(tournamentId);
    const index = leaderboard.findIndex((l) => l.user.id === userId);
    return { rank: index >= 0 ? index + 1 : null, total: leaderboard.length };
  }
}
