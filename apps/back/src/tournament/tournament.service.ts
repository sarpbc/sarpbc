import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { CreateRequestContext, EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { TournamentParticipant } from "./domain/tournament-participant.entity";
import { Tournament } from "./domain/tournament.entity";
import { SyncAllTournamentsUseCase } from "./sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    private readonly syncAllTournamentsUseCase: SyncAllTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly syncPandascoreAdditionsUseCase: SyncPandascoreAdditionsUseCase,
    private readonly em: EntityManager,
  ) {}

  async find({
    limit = 20,
    offset = 0,
    pickems,
  }: {
    limit?: number;
    offset?: number;
    pickems?: boolean;
  }): Promise<Tournament[]> {
    const where: Record<string, unknown> = {};
    if (typeof pickems === "boolean") {
      where.pickemsEnabled = pickems;
    }
    const tournaments = await this.tournamentRepository.find(where, {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: ["league", "participants", "participants.team"],
    });
    return tournaments;
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
          "participants",
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
      throw new Error("Tournament not found");
    }

    tournament.pickemsEnabled = pickemsEnabled;
    await this.em.flush();
  }

  @CreateRequestContext()
  async syncAllTournaments(): Promise<void> {
    try {
      await this.syncAllTournamentsUseCase.execute();
    } catch (error) {
      this.logger.error("Failed to sync tournaments", error);
      throw error;
    }
  }

  async syncTournamentFromPandascore(tournamentId: string): Promise<void> {
    await this.syncPandascoreTournamentUseCase.execute(tournamentId);
  }

  @CreateRequestContext()
  async syncPandascoreAdditions(): Promise<void> {
    await this.syncPandascoreAdditionsUseCase.execute();
  }

  async getTournamentsByPlayer(playerId: string): Promise<Tournament[]> {
    const participants = await this.participantRepository.find(
      {
        players: { id: playerId },
      },
      {
        populate: ["tournament"],
      },
    );

    return participants.map((participant) => participant.tournament);
  }
}
