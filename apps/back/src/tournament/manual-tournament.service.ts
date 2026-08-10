import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import slugify from "slugify";
import { RedisService } from "src/redis/redis.service";
import { Team } from "src/player/player.entities";
import { Match, MatchResult, Tournament, TournamentParticipant } from "./tournament.entities";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/create-tournament.dto";
import { LeagueService } from "./league/league.service";
import { assertManualTournamentWritable } from "./domain/tournament-source";

@Injectable()
export class ManualTournamentService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    private readonly leagueService: LeagueService,
    private readonly redisService: RedisService,
    private readonly em: EntityManager,
  ) {}

  async findLeagues(): Promise<{ id: string; name: string }[]> {
    const leagues = await this.leagueService.find({ limit: 200 });
    return leagues.map((league) => ({ id: league.id, name: league.name }));
  }

  async create(dto: CreateTournamentDto): Promise<Tournament> {
    return this.em.transactional(async (em) => {
      const slug = await this.resolveCreateSlug(dto);
      const league = await this.resolveLeague(dto.leagueId);
      this.assertDateOrder(dto.beginAt, dto.endAt);

      const tournament = new Tournament();
      tournament.source = "manual";
      tournament.pandascoreId = null;
      tournament.name = dto.name;
      tournament.slug = slug;
      tournament.tier = dto.tier?.trim() ? dto.tier.trim() : null;
      tournament.league = league;
      tournament.beginAt = dto.beginAt ? new Date(dto.beginAt) : null;
      tournament.endAt = dto.endAt ? new Date(dto.endAt) : null;
      tournament.imageUrl = dto.imageUrl?.trim() ? dto.imageUrl.trim() : null;
      tournament.hasBracket = false;

      em.persist(tournament);

      if (dto.teamIds?.length) {
        await this.syncParticipants(em, tournament, dto.teamIds);
      }

      await em.flush();
      return this.reloadOrFail(em, tournament.id);
    });
  }

  async update(id: string, dto: UpdateTournamentDto): Promise<Tournament> {
    return this.em.transactional(async (em) => {
      const tournament = await em.findOne(Tournament, { id }, { populate: ["league", "winner"] });
      if (!tournament) {
        throw new NotFoundException(`Tournament with id "${id}" was not found.`);
      }
      assertManualTournamentWritable(tournament.source, "edited manually");

      this.applyPatch(tournament, dto);
      await this.applyLeaguePatch(tournament, dto.leagueId);
      this.assertDateOrder(
        tournament.beginAt?.toISOString() ?? null,
        tournament.endAt?.toISOString() ?? null,
      );

      if (dto.slug !== undefined) {
        tournament.slug = await this.resolveUpdateSlug(dto.slug, tournament.id);
      }

      if (dto.teamIds !== undefined) {
        await this.syncParticipants(em, tournament, dto.teamIds);
      }

      await em.flush();
      await this.redisService.delete(`tournament:${id}`);
      return this.reloadOrFail(em, id);
    });
  }

  private applyPatch(tournament: Tournament, dto: UpdateTournamentDto): void {
    if (dto.name !== undefined) {
      tournament.name = dto.name;
    }
    if (dto.tier !== undefined) {
      tournament.tier = dto.tier?.trim() ? dto.tier.trim() : null;
    }
    if (dto.beginAt !== undefined) {
      tournament.beginAt = dto.beginAt === null ? null : new Date(dto.beginAt);
    }
    if (dto.endAt !== undefined) {
      tournament.endAt = dto.endAt === null ? null : new Date(dto.endAt);
    }
    if (dto.imageUrl !== undefined) {
      tournament.imageUrl = dto.imageUrl?.trim() ? dto.imageUrl.trim() : null;
    }
  }

  private async applyLeaguePatch(
    tournament: Tournament,
    leagueId: string | null | undefined,
  ): Promise<void> {
    if (leagueId === undefined) {
      return;
    }
    if (leagueId === null) {
      tournament.league = null;
      return;
    }
    const league = await this.leagueService.findById(leagueId);
    if (!league) {
      throw new NotFoundException(
        `League with id "${leagueId}" was not found. Choose a league from the list.`,
      );
    }
    tournament.league = league;
  }

  private async resolveCreateSlug(dto: CreateTournamentDto): Promise<string> {
    if (dto.slug) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) {
        throw new ConflictException(
          "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
        );
      }
      await this.assertSlugAvailable(slug);
      return slug;
    }
    return this.generateUniqueSlug(dto.name);
  }

  private async resolveUpdateSlug(raw: string, tournamentId: string): Promise<string> {
    const slug = this.normalizeSlug(raw);
    if (!slug) {
      throw new ConflictException(
        "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
      );
    }
    await this.assertSlugAvailable(slug, tournamentId);
    return slug;
  }

  private async resolveLeague(leagueId: string | null | undefined) {
    if (!leagueId) {
      return null;
    }
    const league = await this.leagueService.findById(leagueId);
    if (!league) {
      throw new NotFoundException(
        `League with id "${leagueId}" was not found. Choose a league from the list.`,
      );
    }
    return league;
  }

  private assertDateOrder(
    beginAt: string | null | undefined,
    endAt: string | null | undefined,
  ): void {
    if (beginAt && endAt && new Date(endAt) < new Date(beginAt)) {
      throw new BadRequestException("End date must be on or after the start date.");
    }
  }

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

  private async syncParticipants(
    em: EntityManager,
    tournament: Tournament,
    teamIds: string[],
  ): Promise<void> {
    const teams = await em.find(Team, { id: { $in: teamIds } });
    if (teams.length !== teamIds.length) {
      throw new BadRequestException(
        "One or more teams were not found. Refresh the team list and try again.",
      );
    }

    const existingParticipants = await em.find(
      TournamentParticipant,
      { tournament },
      { populate: ["team"] },
    );
    const desiredTeamIds = new Set(teamIds);

    for (const participant of existingParticipants) {
      if (desiredTeamIds.has(participant.team.id)) {
        continue;
      }
      await this.assertParticipantRemovable(em, tournament, participant);
      em.remove(participant);
    }

    const existingTeamIds = new Set(existingParticipants.map((participant) => participant.team.id));
    for (const team of teams) {
      if (existingTeamIds.has(team.id)) {
        continue;
      }
      const participant = new TournamentParticipant();
      participant.tournament = tournament;
      participant.team = team;
      em.persist(participant);
    }
  }

  private async assertParticipantRemovable(
    em: EntityManager,
    tournament: Tournament,
    participant: TournamentParticipant,
  ): Promise<void> {
    if (tournament.winner?.id === participant.id) {
      throw new BadRequestException(
        "Cannot remove a team that is the tournament winner. Clear the winner first.",
      );
    }

    const matchAsParticipant = await em.count(Match, {
      tournament,
      participants: participant,
    });
    if (matchAsParticipant > 0) {
      throw new BadRequestException(
        "Cannot remove a team that already appears in matches. Remove or reassign those matches first.",
      );
    }

    const matchAsWinner = await em.count(Match, {
      tournament,
      winner: participant,
    });
    if (matchAsWinner > 0) {
      throw new BadRequestException(
        "Cannot remove a team that is recorded as a match winner. Clear those winners first.",
      );
    }

    const resultRefs = await em.count(MatchResult, { participant });
    if (resultRefs > 0) {
      throw new BadRequestException(
        "Cannot remove a team that has match results. Remove those results first.",
      );
    }
  }

  private async reloadOrFail(em: EntityManager, id: string): Promise<Tournament> {
    const tournament = await em.findOne(
      Tournament,
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
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" was not found after save.`);
    }
    return tournament;
  }
}
