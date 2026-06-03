import { Injectable, Inject, forwardRef, NotFoundException } from "@nestjs/common";
import { PlayerRepository } from "./player.repository";
import { PlayerPhotoRepository } from "./player-photo.repository";
import { ContractRepository } from "./contract.repository";
import { TeamService } from "../team/team.service";
import { Player } from "./domain/player.entity";
import { PlayerPhoto } from "./domain/player-photo.entity";
import { PlayerSearchProps } from "./interfaces/search-player-props";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";

@Injectable()
export class PlayerService {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly playerPhotoRepository: PlayerPhotoRepository,
    private readonly contractRepository: ContractRepository,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
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
    player.firstName = dto.firstName ?? undefined;
    player.lastName = dto.lastName ?? undefined;
    player.birthday = dto.birthday ? new Date(dto.birthday) : undefined;
    player.nationality = dto.nationality ?? undefined;
    player.imageUrl = dto.imageUrl ?? undefined;
    player.slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-");

    if (dto.teamId) {
      const team = await this.teamService.findById(dto.teamId);
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
    if (dto.birthday !== undefined)
      player.birthday = dto.birthday ? new Date(dto.birthday) : undefined;
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
        player.team = undefined;
      } else {
        const team = await this.teamService.findById(dto.teamId);
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
    const team = await this.teamService.findById(teamId);

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
