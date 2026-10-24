import type { RosterStores, RosterTransaction } from "./ports/roster-transaction";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { CreatePlayerInput, LeaveTeamInput, RosterMoveInput, UpdatePlayerInput } from "./inputs";
import { ITeamRepository } from "../../team/application/ports/team.repository.interface";
import { Contract, Player, PlayerPhoto, PlayerStatus, rosterRoleLabel } from "../domain/roster";
import { PlayerSearchProps } from "./search-player-props";

import { IPlayerPhotoRepository } from "./ports/player-photo.repository.interface";
import { IPlayerRepository } from "./ports/player.repository.interface";

export interface RosterMove {
  player: Player;
  opened: Contract | null;
  closed: Contract[];
}

export class PlayerService {
  constructor(
    private readonly playerRepository: IPlayerRepository,
    private readonly playerPhotoRepository: IPlayerPhotoRepository,
    private readonly teamRepository: ITeamRepository,
    private readonly transaction: RosterTransaction,
  ) {}

  async find(options: Partial<PlayerSearchProps>): Promise<Player[]> {
    return this.playerRepository.search(options);
  }

  async findAndCount(options: Partial<PlayerSearchProps>): Promise<[Player[], number]> {
    return this.playerRepository.searchAndCount(options);
  }

  async findById(id: string): Promise<Player | null> {
    return this.resolveMerged(await this.playerRepository.findById(id));
  }

  async findBySlug(slug: string): Promise<Player | null> {
    return this.resolveMerged(await this.playerRepository.findBySlug(slug));
  }

  private async resolveMerged(player: Player | null): Promise<Player | null> {
    return player?.mergedIntoId ? this.playerRepository.findById(player.mergedIntoId) : player;
  }

  async create(dto: CreatePlayerInput): Promise<Player> {
    const player = new Player();
    player.name = dto.name;
    player.firstName = dto.firstName ?? null;
    player.lastName = dto.lastName ?? null;
    player.birthday = dto.birthday ? new Date(dto.birthday) : null;
    player.nationality = dto.nationality ?? null;
    player.imageUrl = dto.imageUrl ?? null;
    player.slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-");
    if (dto.status !== undefined) player.status = dto.status;
    if (dto.role !== undefined) player.role = rosterRoleLabel(dto.role);
    if (dto.source !== undefined) player.source = dto.source;

    if (await this.playerRepository.findBySlug(player.slug)) {
      throw new ConflictError(`A player with slug "${player.slug}" already exists`);
    }

    if (dto.teamId) {
      const team = await this.teamRepository.findById(dto.teamId);
      if (team) {
        player.team = team;
      }
    }

    await this.playerRepository.save(player);
    return player;
  }

  async update(id: string, dto: UpdatePlayerInput): Promise<Player> {
    return this.transaction.run(async ({ players, photos, teams }) => {
      const player = requireUnmerged(await players.findById(id), id);

      if (dto.name !== undefined) player.name = dto.name;
      if (dto.firstName !== undefined) player.firstName = dto.firstName;
      if (dto.lastName !== undefined) player.lastName = dto.lastName;
      if (dto.birthday !== undefined)
        player.birthday = dto.birthday ? new Date(dto.birthday) : null;
      if (dto.nationality !== undefined) player.nationality = dto.nationality;
      if (dto.slug !== undefined) player.slug = dto.slug;
      if (dto.status !== undefined) player.status = dto.status;
      if (dto.role !== undefined) player.role = rosterRoleLabel(dto.role);

      if (dto.imageUrl !== undefined) {
        const archived = player.replaceProfilePhoto(dto.imageUrl);
        if (archived) {
          const photo = new PlayerPhoto();
          photo.player = player;
          photo.url = archived;
          await photos.save(photo);
        }
        player.imageUrl = dto.imageUrl;
      }

      if (dto.teamId !== undefined) {
        if (dto.teamId === null) {
          player.team = null;
        } else {
          const team = await teams.findById(dto.teamId);
          if (team) {
            player.team = team;
          }
        }
      }

      await players.save(player);
      return player;
    });
  }

  async joinTeam(playerId: string, input: RosterMoveInput): Promise<RosterMove> {
    return this.transaction.run(async ({ players, teams, contracts }) => {
      const player = requireUnmerged(await players.findById(playerId), playerId);
      const team = await teams.findById(input.teamId);
      if (!team) throw new NotFoundError(`Team with id "${input.teamId}" not found`);
      if (!team.active) throw new InvalidInputError(`Team "${team.name}" is inactive`);

      const effectiveDate = new Date(input.effectiveDate);
      const open = await openContracts(contracts, playerId);
      if (open.some((contract) => contract.team.id === team.id)) {
        throw new ConflictError(`${player.name} already has an open contract with ${team.name}`);
      }
      for (const contract of open) {
        contract.close(effectiveDate, input.sourceUrl);
        await contracts.save(contract);
      }

      const contract = new Contract();
      contract.player = player;
      contract.team = team;
      contract.startDate = effectiveDate;
      contract.joinSourceUrl = input.sourceUrl;
      await contracts.save(contract);

      player.team = team;
      player.status = PlayerStatus.ACTIVE;
      await players.save(player);
      return { player, opened: contract, closed: open };
    });
  }

  async leaveTeam(playerId: string, input: LeaveTeamInput): Promise<RosterMove> {
    return this.transaction.run(async ({ players, contracts }) => {
      const player = requireUnmerged(await players.findById(playerId), playerId);

      const closed = (await openContracts(contracts, playerId)).filter(
        (contract) => contract.team.id === input.teamId,
      );
      // Players imported from PandaScore have a current team but no contract row.
      if (closed.length === 0 && player.team?.id !== input.teamId) {
        throw new InvalidInputError(`${player.name} is not on team "${input.teamId}"`);
      }
      for (const contract of closed) {
        contract.close(new Date(input.effectiveDate), input.sourceUrl);
        await contracts.save(contract);
      }

      if (player.team?.id === input.teamId) {
        player.team = null;
        player.status = input.status;
      }
      await players.save(player);
      return { player, opened: null, closed };
    });
  }

  async delete(id: string): Promise<void> {
    return this.transaction.run(async ({ players, photos, contracts }) => {
      const player = await players.findById(id);
      if (!player) {
        throw new NotFoundError(`Player with id "${id}" not found`);
      }
      const existingContracts = await contracts.findByPlayer(id);
      for (const contract of existingContracts) {
        await contracts.delete(contract);
      }
      const existingPhotos = await photos.findByPlayer(id);
      for (const photo of existingPhotos) {
        await photos.delete(photo);
      }
      await players.delete(player);
    });
  }

  async getRandomPlayer(): Promise<Player | null> {
    return this.playerRepository.getRandomPlayer();
  }

  async getPhotos(playerId: string): Promise<PlayerPhoto[]> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(`Player with id "${playerId}" not found`);
    }
    return this.playerPhotoRepository.findByPlayer(playerId);
  }

  async addPhoto(playerId: string, url: string): Promise<PlayerPhoto> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(`Player with id "${playerId}" not found`);
    }

    const photo = new PlayerPhoto();
    photo.player = player;
    photo.url = url;
    await this.playerPhotoRepository.save(photo);
    return photo;
  }

  async deletePhoto(playerId: string, photoId: string): Promise<void> {
    const photo = await this.playerPhotoRepository.findById(photoId);
    if (!photo || photo.player.id !== playerId) {
      throw new NotFoundError(`Photo with id "${photoId}" not found`);
    }
    await this.playerPhotoRepository.delete(photo);
  }

  async setProfilePhoto(playerId: string, photoId: string): Promise<Player> {
    return this.transaction.run(async ({ players, photos }) => {
      const player = await players.findById(playerId);
      if (!player) {
        throw new NotFoundError(`Player with id "${playerId}" not found`);
      }

      const photo = await photos.findById(photoId);
      if (!photo || photo.player.id !== playerId) {
        throw new NotFoundError(`Photo with id "${photoId}" not found`);
      }

      const archived = player.replaceProfilePhoto(photo.url);
      if (archived) {
        const archivedPhoto = new PlayerPhoto();
        archivedPhoto.player = player;
        archivedPhoto.url = archived;
        await photos.save(archivedPhoto);
      }

      player.imageUrl = photo.url;
      await photos.delete(photo);
      await players.save(player);
      return player;
    });
  }
}

async function openContracts(
  contracts: RosterStores["contracts"],
  playerId: string,
): Promise<Contract[]> {
  return (await contracts.findByPlayer(playerId)).filter((contract) => contract.endDate === null);
}

function requireUnmerged(player: Player | null, id: string): Player {
  if (!player) throw new NotFoundError(`Player with id "${id}" not found`);
  if (player.mergedIntoId) {
    throw new InvalidInputError(
      `${player.name} was merged into player "${player.mergedIntoId}"; edit that player instead`,
    );
  }
  return player;
}
