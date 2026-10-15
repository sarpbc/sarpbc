import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { log } from "evlog";
import { RedisService } from "src/redis/redis.service";
import { Tournament, TournamentParticipant } from "./tournament.entities";
import { TournamentRepository } from "./tournament.repository";
import { SyncAllTournamentsUseCase } from "./sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import {
  SyncNewTournamentsResult,
  SyncNewTournamentsUseCase,
} from "./sync/sync-new-tournaments.use-case";

const HOUR_MS = 60 * 60 * 1000;
const ACTIVE_LOOKAHEAD_MS = 24 * HOUR_MS;
const ACTIVE_MAX_DURATION_MS = 7 * 24 * HOUR_MS;
const ACTIVE_GRACE_AFTER_END_MS = 6 * HOUR_MS;

interface TournamentListFilter {
  pickemsEnabled?: boolean;
  winner?: null;
  $or?: Array<{ endAt: null } | { endAt: { $gt: Date } }>;
}

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: TournamentRepository,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    private readonly syncAllTournamentsUseCase: SyncAllTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly syncNewTournamentsUseCase: SyncNewTournamentsUseCase,
    private readonly redisService: RedisService,
    private readonly em: EntityManager,
  ) {}

  async find({
    limit = 20,
    offset = 0,
    pickems,
    activeOnly = false,
  }: {
    limit?: number;
    offset?: number;
    pickems?: boolean;
    activeOnly?: boolean;
  }): Promise<[Tournament[], number]> {
    const where: TournamentListFilter = {};
    if (pickems === true || pickems === false) {
      where.pickemsEnabled = pickems;
    }
    if (activeOnly) {
      // Homepage / CTA: only open pick'ems — not finished events.
      where.winner = null;
      where.$or = [{ endAt: null }, { endAt: { $gt: new Date() } }];
    }
    return this.tournamentRepository.findAndCount(where, {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: activeOnly ? ["league"] : ["league", "participants", "participants.team"],
    });
  }

  async searchByName({
    name,
    limit = 25,
    offset = 0,
  }: {
    name: string;
    limit?: number;
    offset?: number;
  }): Promise<Tournament[]> {
    return this.tournamentRepository.searchByName({ name, limit, offset });
  }

  async findPandascoreWithoutMatches(): Promise<Pick<Tournament, "id" | "name">[]> {
    return this.tournamentRepository.findPandascoreWithoutMatches();
  }

  /**
   * Tournaments starting within the next day or still running. Their matches are
   * often created or scheduled on PandaScore after the tournament is discovered.
   */
  async findPandascoreActiveIds(now: Date = new Date()): Promise<string[]> {
    const tournaments = await this.tournamentRepository.findPandascoreActive({
      beginsBefore: new Date(now.getTime() + ACTIVE_LOOKAHEAD_MS),
      beganAfter: new Date(now.getTime() - ACTIVE_MAX_DURATION_MS),
      endsAfter: new Date(now.getTime() - ACTIVE_GRACE_AFTER_END_MS),
    });
    return tournaments.map((tournament) => tournament.id);
  }

  async findById(id: string): Promise<Tournament | null> {
    const tournament = await this.tournamentRepository.findOne(
      { id },
      {
        populate: [
          "matches",
          "matches.participants",
          "matches.participants.team",
          "matches.previousMatches",
          "matches.previousMatches.previousMatch",
          "matches.results",
          "matches.results.participant",
          "matches.winner",
          "participants",
          "participants.team",
          "participants.players",
          "winner",
          "winner.team",
          "league",
        ],
      },
    );
    return tournament;
  }

  async setTournamentPickemsEnabled(tournamentId: string, pickemsEnabled: boolean): Promise<void> {
    const tournament = await this.tournamentRepository.findOne({
      id: tournamentId,
    });

    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }

    tournament.pickemsEnabled = pickemsEnabled;
    await this.em.flush();
  }

  @CreateRequestContext()
  async syncAllTournaments(): Promise<void> {
    try {
      await this.syncAllTournamentsUseCase.execute();
    } catch (error) {
      log.error({
        component: TournamentService.name,
        message: "Failed to sync tournaments",
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  async syncTournamentFromPandascore(tournamentId: string): Promise<void> {
    await this.syncPandascoreTournamentUseCase.execute(tournamentId);
    // The cached detail payload is stale after a sync.
    await this.redisService.delete(`tournament:${tournamentId}`);
  }

  async syncTournamentByPandascoreId(pandascoreId: number): Promise<string> {
    const tournamentId =
      await this.syncPandascoreTournamentUseCase.executeByPandascoreId(pandascoreId);
    await this.redisService.delete(`tournament:${tournamentId}`);
    return tournamentId;
  }

  @CreateRequestContext()
  async syncNewTournamentsFromPandascore(): Promise<SyncNewTournamentsResult> {
    return this.syncNewTournamentsUseCase.execute();
  }

  async getTournamentsByPlayer(playerId: string): Promise<Tournament[]> {
    const participants = await this.participantRepository.find(
      {
        players: { id: playerId },
      },
      {
        populate: [
          "tournament",
          "tournament.league",
          "tournament.winner",
          "tournament.winner.team",
          "tournament.winner.players",
        ],
      },
    );

    const tournamentsById = new Map<string, Tournament>();
    for (const participant of participants) {
      const tournament = participant.tournament;
      if (tournament && !tournamentsById.has(tournament.id)) {
        tournamentsById.set(tournament.id, tournament);
      }
    }

    return [...tournamentsById.values()];
  }

  async getTournamentsWonByTeam(teamId: string): Promise<Tournament[]> {
    return this.tournamentRepository.find(
      { winner: { team: { id: teamId } } },
      {
        populate: ["league", "winner", "winner.team"],
        orderBy: { endAt: "DESC" },
      },
    );
  }

  async getTournamentsWonByPlayer(playerId: string): Promise<Tournament[]> {
    return this.tournamentRepository.find(
      { winner: { players: { id: playerId } } },
      {
        populate: ["league", "winner", "winner.team"],
        orderBy: { endAt: "DESC" },
      },
    );
  }

  async getTournamentsByTeam(teamId: string): Promise<Tournament[]> {
    const participants = await this.participantRepository.find(
      { team: { id: teamId } },
      {
        populate: [
          "tournament",
          "tournament.league",
          "tournament.winner",
          "tournament.winner.team",
        ],
      },
    );

    const tournamentsById = new Map<string, Tournament>();
    for (const participant of participants) {
      const tournament = participant.tournament;
      if (tournament && !tournamentsById.has(tournament.id)) {
        tournamentsById.set(tournament.id, tournament);
      }
    }

    return Array.from(tournamentsById.values());
  }
}
