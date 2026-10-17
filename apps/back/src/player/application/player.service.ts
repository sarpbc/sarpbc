import type { RosterTransaction } from "./ports/roster-transaction";
import { NotFoundError } from "../../common/domain/errors";
import { CreatePlayerInput, UpdatePlayerInput } from "./inputs";
import { ITeamRepository } from "../../team/application/ports/team.repository.interface";
import { Player, PlayerPhoto } from "../domain/roster";
import { PlayerSearchProps } from "./search-player-props";

import { IPlayerPhotoRepository } from "./ports/player-photo.repository.interface";
import { IPlayerRepository } from "./ports/player.repository.interface";

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
    return this.playerRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<Player | null> {
    return this.playerRepository.findBySlug(slug);
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
      const player = await players.findById(id);
      if (!player) {
        throw new NotFoundError(`Player with id "${id}" not found`);
      }

      if (dto.name !== undefined) player.name = dto.name;
      if (dto.firstName !== undefined) player.firstName = dto.firstName;
      if (dto.lastName !== undefined) player.lastName = dto.lastName;
      if (dto.birthday !== undefined)
        player.birthday = dto.birthday ? new Date(dto.birthday) : null;
      if (dto.nationality !== undefined) player.nationality = dto.nationality;
      if (dto.slug !== undefined) player.slug = dto.slug;

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

  async assignToTeam(playerId: string, teamId: string): Promise<Player | null> {
    const player = await this.playerRepository.findById(playerId);
    const team = await this.teamRepository.findById(teamId);

    if (player && team) {
      player.team = team;
      await this.playerRepository.save(player);
    }

    return player;
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
