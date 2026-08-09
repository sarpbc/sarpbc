import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { log } from "evlog";
import slugify from "slugify";
import { RedisService } from "src/redis/redis.service";
import { Team } from "src/player/player.entities";
import { Tournament, TournamentParticipant } from "./tournament.entities";
import { SyncAllTournamentsUseCase } from "./sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { UpdateTournamentDto } from "./dto/update-tournament.dto";
import { LeagueService } from "./league/league.service";

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    private readonly syncAllTournamentsUseCase: SyncAllTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly syncPandascoreAdditionsUseCase: SyncPandascoreAdditionsUseCase,
    private readonly redisService: RedisService,
    private readonly leagueService: LeagueService,
    private readonly em: EntityManager,
  ) {}

  private normalizeSlug(value: string): string {
    return slugify(value, { lower: true, strict: true });
  }

  private async generateUniqueSlug(source: string, excludeTournamentId?: string): Promise<string> {
    const base = this.normalizeSlug(source);
    if (!base) {
      throw new ConflictException(
        "Could not generate a URL slug from that name. Add a slug manually (letters, numbers, hyphens).",
      );
    }
    let slug = base;
    let suffix = 1;
    while (true) {
      const existing = await this.tournamentRepository.findOne({ slug });
      if (!existing || existing.id === excludeTournamentId) {
        return slug;
      }
      slug = `${base}-${suffix++}`;
    }
  }

  private async assertSlugAvailable(slug: string, excludeTournamentId?: string): Promise<void> {
    const existing = await this.tournamentRepository.findOne({ slug });
    if (existing && existing.id !== excludeTournamentId) {
      throw new ConflictException(
        `A tournament with the slug "${slug}" already exists. Choose a different slug.`,
      );
    }
  }

  private parseOptionalDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return new Date(value);
  }

  private async syncParticipants(tournament: Tournament, teamIds: string[]): Promise<void> {
    const teams = await this.em.find(Team, { id: { $in: teamIds } });
    if (teams.length !== teamIds.length) {
      throw new BadRequestException(
        "One or more teams were not found. Refresh the team list and try again.",
      );
    }

    const existingParticipants = await this.participantRepository.find(
      { tournament },
      { populate: ["team"] },
    );
    const desiredTeamIds = new Set(teamIds);

    for (const participant of existingParticipants) {
      if (!desiredTeamIds.has(participant.team.id)) {
        this.em.remove(participant);
      }
    }

    const existingTeamIds = new Set(existingParticipants.map((participant) => participant.team.id));
    for (const team of teams) {
      if (existingTeamIds.has(team.id)) {
        continue;
      }
      const participant = new TournamentParticipant();
      participant.tournament = tournament;
      participant.team = team;
      this.em.persist(participant);
    }
  }

  async createManual(dto: CreateTournamentDto): Promise<Tournament> {
    let slug: string;
    if (dto.slug) {
      slug = this.normalizeSlug(dto.slug);
      if (!slug) {
        throw new ConflictException(
          "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
        );
      }
      await this.assertSlugAvailable(slug);
    } else {
      slug = await this.generateUniqueSlug(dto.name);
    }

    let league = null;
    if (dto.leagueId) {
      league = await this.leagueService.findById(dto.leagueId);
      if (!league) {
        throw new NotFoundException(
          `League with id "${dto.leagueId}" was not found. Choose a league from the list.`,
        );
      }
    }

    if (dto.beginAt && dto.endAt && new Date(dto.endAt) < new Date(dto.beginAt)) {
      throw new BadRequestException("End date must be on or after the start date.");
    }

    const tournament = new Tournament();
    tournament.source = "manual";
    tournament.pandascoreId = null;
    tournament.name = dto.name;
    tournament.slug = slug;
    tournament.tier = dto.tier ?? null;
    tournament.league = league;
    tournament.beginAt = dto.beginAt ? new Date(dto.beginAt) : null;
    tournament.endAt = dto.endAt ? new Date(dto.endAt) : null;
    tournament.imageUrl = dto.imageUrl ?? null;
    tournament.hasBracket = false;

    this.em.persist(tournament);
    await this.em.flush();

    if (dto.teamIds?.length) {
      await this.syncParticipants(tournament, dto.teamIds);
      await this.em.flush();
    }

    return (await this.findById(tournament.id))!;
  }

  async updateManual(id: string, dto: UpdateTournamentDto): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({ id }, { populate: ["league"] });
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" was not found.`);
    }
    if (tournament.source !== "manual") {
      throw new BadRequestException(
        "This tournament is synced from PandaScore and cannot be edited manually. Create a manual tournament instead.",
      );
    }

    if (dto.name !== undefined) {
      tournament.name = dto.name;
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) {
        throw new ConflictException(
          "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
        );
      }
      await this.assertSlugAvailable(slug, tournament.id);
      tournament.slug = slug;
    }

    if (dto.tier !== undefined) {
      tournament.tier = dto.tier || null;
    }

    if (dto.leagueId !== undefined) {
      if (dto.leagueId === null) {
        tournament.league = null;
      } else {
        const league = await this.leagueService.findById(dto.leagueId);
        if (!league) {
          throw new NotFoundException(
            `League with id "${dto.leagueId}" was not found. Choose a league from the list.`,
          );
        }
        tournament.league = league;
      }
    }

    const beginAt = this.parseOptionalDate(dto.beginAt);
    const endAt = this.parseOptionalDate(dto.endAt);
    if (beginAt !== undefined) {
      tournament.beginAt = beginAt;
    }
    if (endAt !== undefined) {
      tournament.endAt = endAt;
    }
    if (tournament.beginAt && tournament.endAt && tournament.endAt < tournament.beginAt) {
      throw new BadRequestException("End date must be on or after the start date.");
    }

    if (dto.imageUrl !== undefined) {
      tournament.imageUrl = dto.imageUrl || null;
    }

    if (dto.teamIds !== undefined) {
      await this.syncParticipants(tournament, dto.teamIds);
    }

    await this.em.flush();
    await this.invalidateTournamentCache(id);

    return (await this.findById(id))!;
  }

  async invalidateTournamentCache(tournamentId: string): Promise<void> {
    await this.redisService.delete(`tournament:${tournamentId}`);
  }

  async findLeagues(): Promise<{ id: string; name: string }[]> {
    const leagues = await this.leagueService.find({ limit: 200 });
    return leagues.map((league) => ({ id: league.id, name: league.name }));
  }

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
  }): Promise<Tournament[]> {
    const where: Record<string, unknown> = {};
    if (typeof pickems === "boolean") {
      where.pickemsEnabled = pickems;
    }
    if (activeOnly) {
      // Homepage / CTA: only open pick'ems — not finished events.
      where.winner = null;
      where.$or = [{ endAt: null }, { endAt: { $gt: new Date() } }];
    }
    const tournaments = await this.tournamentRepository.find(where, {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: activeOnly ? ["league"] : ["league", "participants", "participants.team"],
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
