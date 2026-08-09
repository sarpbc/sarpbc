import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import type { PlayerAwardListItem } from "@sarpbc/types";
import { Player, PlayerAwardType } from "./player.entities";
import { Tournament, TournamentParticipant } from "../tournament/tournament.entities";
import { PlayerAward } from "../tournament/player-award.entities";

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

  async findByPlayerId(playerId: string): Promise<PlayerAwardListItem[]> {
    const player = await this.playerRepository.findOne({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }

    const awards = await this.awardRepository.find(
      { player: { id: playerId } },
      {
        populate: ["tournament", "tournament.league", "player", "participant", "participant.team"],
        orderBy: { tournament: { endAt: "DESC" } },
      },
    );

    return awards.map((award) => this.toListItem(award));
  }

  async findByTournamentId(tournamentId: string): Promise<PlayerAwardListItem[]> {
    const tournament = await this.tournamentRepository.findOne({ id: tournamentId });
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${tournamentId}" not found`);
    }

    const awards = await this.awardRepository.find(
      { tournament: { id: tournamentId } },
      {
        populate: ["tournament", "tournament.league", "player", "participant", "participant.team"],
        orderBy: { createdAt: "ASC" },
      },
    );

    return awards.map((award) => this.toListItem(award));
  }

  async create(
    tournamentId: string,
    participantId: string,
    playerId: string,
    awardType: PlayerAwardType,
  ): Promise<PlayerAwardListItem> {
    const tournament = await this.tournamentRepository.findOne({ id: tournamentId });
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${tournamentId}" not found`);
    }

    const participant = await this.participantRepository.findOne(
      { id: participantId, tournament: { id: tournamentId } },
      { populate: ["players", "team"] },
    );
    if (!participant) {
      throw new NotFoundException(
        `Tournament participant with id "${participantId}" was not found for this tournament`,
      );
    }

    const player = await this.playerRepository.findOne({ id: playerId });
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

    const existingForPlayer = await this.awardRepository.findOne({
      tournament: { id: tournamentId },
      player: { id: playerId },
      awardType,
    });
    if (existingForPlayer) {
      throw new ConflictException(
        `${player.name} already has the ${awardLabel(awardType)} award for ${tournament.name}.`,
      );
    }

    if (awardType === PlayerAwardType.MVP) {
      const existingMvp = await this.awardRepository.findOne({
        tournament: { id: tournamentId },
        awardType: PlayerAwardType.MVP,
      });
      if (existingMvp) {
        throw new ConflictException(
          `${tournament.name} already has an MVP award. Remove the current MVP before assigning another player.`,
        );
      }
    }

    const award = this.awardRepository.create({
      tournament,
      participant,
      player,
      awardType,
      createdAt: new Date(),
    });
    await this.em.persist(award).flush();

    await this.awardRepository.populate(award, [
      "tournament",
      "tournament.league",
      "player",
      "participant",
      "participant.team",
    ]);

    return this.toListItem(award);
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

  private toListItem(award: PlayerAward): PlayerAwardListItem {
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
