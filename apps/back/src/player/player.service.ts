import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { ITeamRepository, TEAM_REPOSITORY } from "../team/domain/team.repository.interface";
import { Player, PlayerPhoto } from "./player.entities";
import { PlayerSearchProps } from "./interfaces/search-player-props";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import { IContractRepository, CONTRACT_REPOSITORY } from "./domain/contract.repository.interface";
import {
  IPlayerPhotoRepository,
  PLAYER_PHOTO_REPOSITORY,
} from "./domain/player-photo.repository.interface";
import { IPlayerRepository, PLAYER_REPOSITORY } from "./domain/player.repository.interface";

@Injectable()
export class PlayerService {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
    @Inject(PLAYER_PHOTO_REPOSITORY)
    private readonly playerPhotoRepository: IPlayerPhotoRepository,
    @Inject(CONTRACT_REPOSITORY)
    private readonly contractRepository: IContractRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
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

  async create(dto: CreatePlayerDto): Promise<Player>;
  async create(
    name: string,
    teamId?: string,
    firstName?: string,
    lastName?: string,
    birthday?: string,
    nationality?: string,
    imageUrl?: string,
    slug?: string,
  ): Promise<Player>;
  async create(
    nameOrDto: string | CreatePlayerDto,
    teamId?: string,
    firstName?: string,
    lastName?: string,
    birthday?: string,
    nationality?: string,
    imageUrl?: string,
    slug?: string,
  ): Promise<Player> {
    const dto: CreatePlayerDto =
      typeof nameOrDto === "string"
        ? {
            name: nameOrDto,
            teamId,
            firstName,
            lastName,
            birthday,
            nationality,
            imageUrl,
            slug,
          }
        : nameOrDto;

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

  async update(id: string, dto: UpdatePlayerDto): Promise<Player> {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    if (dto.name !== undefined) player.name = dto.name;
    if (dto.firstName !== undefined) player.firstName = dto.firstName;
    if (dto.lastName !== undefined) player.lastName = dto.lastName;
    if (dto.birthday !== undefined) player.birthday = dto.birthday ? new Date(dto.birthday) : null;
    if (dto.nationality !== undefined) player.nationality = dto.nationality;
    if (dto.slug !== undefined) player.slug = dto.slug;

    if (dto.imageUrl !== undefined) {
      if (player.imageUrl && player.imageUrl !== dto.imageUrl) {
        const photo = new PlayerPhoto();
        photo.player = player;
        photo.url = player.imageUrl;
        await this.playerPhotoRepository.save(photo);
      }
      player.imageUrl = dto.imageUrl;
    }

    if (dto.teamId !== undefined) {
      if (dto.teamId === null) {
        player.team = null;
      } else {
        const team = await this.teamRepository.findById(dto.teamId);
        if (team) {
          player.team = team;
        }
      }
    }

    await this.playerRepository.save(player);
    return player;
  }

  async delete(id: string): Promise<void> {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }
    const contracts = await this.contractRepository.findByPlayer(id);
    for (const contract of contracts) {
      await this.contractRepository.delete(contract);
    }
    const photos = await this.playerPhotoRepository.findByPlayer(id);
    for (const photo of photos) {
      await this.playerPhotoRepository.delete(photo);
    }
    await this.playerRepository.delete(player);
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
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }
    return this.playerPhotoRepository.findByPlayer(playerId);
  }

  async addPhoto(playerId: string, url: string): Promise<PlayerPhoto> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
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
      throw new NotFoundException(`Photo with id "${photoId}" not found`);
    }
    await this.playerPhotoRepository.delete(photo);
  }

  async setProfilePhoto(playerId: string, photoId: string): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }

    const photo = await this.playerPhotoRepository.findById(photoId);
    if (!photo || photo.player.id !== playerId) {
      throw new NotFoundException(`Photo with id "${photoId}" not found`);
    }

    if (player.imageUrl && player.imageUrl !== photo.url) {
      const archivedPhoto = new PlayerPhoto();
      archivedPhoto.player = player;
      archivedPhoto.url = player.imageUrl;
      await this.playerPhotoRepository.save(archivedPhoto);
    }

    player.imageUrl = photo.url;
    await this.playerPhotoRepository.delete(photo);
    await this.playerRepository.save(player);
    return player;
  }
}
