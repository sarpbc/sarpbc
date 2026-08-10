import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import type { PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import { PlayerAwardType } from "@sarpbc/types";
import { Player } from "../player/player.entities";
import { Tournament, TournamentParticipant } from "./tournament.entities";
import { PlayerAward } from "./player-award.entities";

function awardLabel(awardType: PlayerAwardType): string {
  switch (awardType) {
    case PlayerAwardType.MVP:
      return "MVP";
    default: {
      const _exhaustive: never = awardType;
      return _exhaustive;
    }
  }
}

@Injectable()
export class PlayerAwardService {
  constructor(
    @InjectRepository(PlayerAward)
    private readonly awardRepository: EntityRepository<PlayerAward>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    @InjectRepository(Player)
    private readonly playerRepository: EntityRepository<Player>,
    private readonly em: EntityManager,
  ) {}

  async findByPlayerId(playerId: string): Promise<PlayerProfileAward[]> {
    const player = await this.playerRepository.findOne({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }

    const awards = await this.awardRepository.find(
      { player: { id: playerId } },
      {
        populate: ["tournament", "tournament.league"],
        orderBy: { tournament: { endAt: "DESC" } },
      },
    );

    return awards.map((award) => this.toProfileItem(award));
  }

  async findByTournamentId(tournamentId: string): Promise<TournamentAwardListItem[]> {
    const tournament = await this.tournamentRepository.findOne({ id: tournamentId });
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${tournamentId}" not found`);
    }

    const awards = await this.awardRepository.find(
      { tournament: { id: tournamentId } },
      {
        populate: ["player", "participant", "participant.team"],
        orderBy: { createdAt: "ASC" },
      },
    );

    return awards.map((award) => this.toTournamentItem(award));
  }

  async create(
    tournamentId: string,
    participantId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ): Promise<TournamentAwardListItem> {
    const [tournament, participant, player] = await Promise.all([
      this.tournamentRepository.findOne({ id: tournamentId }),
      this.participantRepository.findOne(
        { id: participantId, tournament: { id: tournamentId } },
        { populate: ["players", "team"] },
      ),
      this.playerRepository.findOne({ id: playerId }),
    ]);

    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${tournamentId}" not found`);
    }
    if (!participant) {
      throw new NotFoundException(
        `Tournament participant with id "${participantId}" was not found for this tournament`,
      );
    }
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }

    const isOnRoster = participant.players
      .getItems()
      .some((rosterPlayer) => rosterPlayer.id === playerId);
    if (!isOnRoster) {
      throw new BadRequestException(
        `${player.name} is not on the roster for ${participant.team.name}. Add the player to this team in the tournament roster first.`,
      );
    }

    const award = this.awardRepository.create({
      tournament,
      participant,
      player,
      awardType,
      createdAt: new Date(),
    });

    try {
      await this.em.persist(award).flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException(
          `${tournament.name} already has a ${awardLabel(awardType)} award. Remove the current award before assigning another player.`,
        );
      }
      throw error;
    }

    await this.awardRepository.populate(award, ["player", "participant", "participant.team"]);
    return this.toTournamentItem(award);
  }

  async delete(tournamentId: string, awardId: string): Promise<void> {
    const award = await this.awardRepository.findOne({
      id: awardId,
      tournament: { id: tournamentId },
    });
    if (!award) {
      throw new NotFoundException(
        `Award with id "${awardId}" was not found for tournament "${tournamentId}"`,
      );
    }

    await this.em.remove(award).flush();
  }

  private toProfileItem(award: PlayerAward): PlayerProfileAward {
    const tournament = award.tournament;
    const league = tournament.league;

    return {
      id: award.id,
      awardType: award.awardType,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        endAt: tournament.endAt,
        serie: tournament.serie,
        leagueName: league?.name,
      },
    };
  }

  private toTournamentItem(award: PlayerAward): TournamentAwardListItem {
    return {
      id: award.id,
      awardType: award.awardType,
      player: {
        id: award.player.id,
        name: award.player.name,
        slug: award.player.slug,
      },
      participant: {
        id: award.participant.id,
        team: award.participant.team
          ? {
              id: award.participant.team.id,
              name: award.participant.team.name,
            }
          : undefined,
      },
    };
  }
}
