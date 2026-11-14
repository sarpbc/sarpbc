import { toSlug } from "@sarpbc/utils";
import { mapSequentially } from "../../common/application/sequentially";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { CreatePlayerInput, JoinTeamInput, LeaveTeamInput, UpdatePlayerInput } from "./inputs";
import { Contract } from "../domain/contract";
import { Player } from "../domain/player";
import { PlayerPhoto } from "../domain/player-photo";
import type {
  ContractWriter,
  NationalityCount,
  PhotoQueries,
  PlayerQueries,
  RosterTransaction,
} from "./ports";
import { requireTeam } from "./require-team";
import type { DirectorySearchProps } from "./search-props";

async function openContracts(contracts: ContractWriter, playerId: string): Promise<Contract[]> {
  const all = await contracts.findByPlayer(playerId);

  return all.filter((contract) => contract.endDate === null);
}

function requireUnmerged(player: Player | null, id: string): Player {
  if (!player) throw new NotFoundError(`Player with id "${id}" not found`);

  if (player.mergedIntoId !== null && player.mergedIntoId !== "") {
    throw new InvalidInputError(
      `${player.name} was merged into player "${player.mergedIntoId}"; edit that player instead`,
    );
  }

  return player;
}

export class PlayerService {
  constructor(
    private readonly players: PlayerQueries,
    private readonly photos: PhotoQueries,
    private readonly transaction: RosterTransaction,
  ) {}

  async find(options: Partial<DirectorySearchProps>): Promise<Player[]> {
    return await this.players.search(options);
  }

  async findAndCount(options: Partial<DirectorySearchProps>): Promise<[Player[], number]> {
    return await this.players.searchAndCount(options);
  }

  async findById(id: string): Promise<Player | null> {
    return await this.resolveMerged(await this.players.findById(id));
  }

  async findBySlug(slug: string): Promise<Player | null> {
    return await this.resolveMerged(await this.players.findBySlug(slug));
  }

  private async resolveMerged(player: Player | null): Promise<Player | null> {
    return player?.mergedIntoId !== null &&
      player?.mergedIntoId !== undefined &&
      player.mergedIntoId !== ""
      ? await this.players.findById(player.mergedIntoId)
      : player;
  }

  async create(dto: CreatePlayerInput): Promise<Player> {
    return await this.transaction.run(async ({ players, teams }) => {
      const player = new Player();
      player.name = dto.name;
      player.firstName = dto.firstName ?? null;
      player.lastName = dto.lastName ?? null;
      player.birthday =
        dto.birthday !== undefined && dto.birthday !== "" ? new Date(dto.birthday) : null;
      player.nationality = dto.nationality ?? null;
      player.imageUrl = dto.imageUrl ?? null;
      player.slug = dto.slug ?? (toSlug(dto.name) || "player");

      if (dto.status !== undefined) player.status = dto.status;

      if (dto.source !== undefined) player.source = dto.source;

      if (await players.findBySlug(player.slug)) {
        throw new ConflictError(`A player with slug "${player.slug}" already exists`);
      }

      if (dto.teamId !== undefined && dto.teamId !== "")
        player.team = await requireTeam(teams, dto.teamId);

      await players.save(player);

      return player;
    });
  }

  async update(id: string, dto: UpdatePlayerInput): Promise<Player> {
    return await this.transaction.run(async ({ players, photos, teams }) => {
      const player = requireUnmerged(await players.findById(id), id);

      if (dto.name !== undefined) player.name = dto.name;

      if (dto.firstName !== undefined) player.firstName = dto.firstName;

      if (dto.lastName !== undefined) player.lastName = dto.lastName;

      if (dto.birthday !== undefined)
        player.birthday = dto.birthday ? new Date(dto.birthday) : null;

      if (dto.nationality !== undefined) player.nationality = dto.nationality;

      if (dto.slug !== undefined) player.slug = dto.slug;

      if (dto.status !== undefined) player.status = dto.status;

      if (dto.imageUrl !== undefined) {
        const archived = player.replaceProfilePhoto(dto.imageUrl);

        if (archived !== null && archived !== "") {
          const photo = new PlayerPhoto();
          photo.player = player;
          photo.url = archived;
          await photos.save(photo);
        }

        player.imageUrl = dto.imageUrl;
      }

      if (dto.teamId !== undefined) {
        player.team = dto.teamId === null ? null : await requireTeam(teams, dto.teamId);
      }

      await players.save(player);

      return player;
    });
  }

  async joinTeam(playerId: string, input: JoinTeamInput): Promise<Player> {
    return await this.transaction.run(async ({ players, teams, contracts }) => {
      const player = requireUnmerged(await players.findById(playerId), playerId);
      const team = await teams.findById(input.teamId);

      if (!team) throw new NotFoundError(`Team with id "${input.teamId}" not found`);

      if (!team.active) throw new InvalidInputError(`Team "${team.name}" is inactive`);

      const effectiveDate = new Date(input.effectiveDate);
      const role = input.role ?? "active";
      const open = await openContracts(contracts, playerId);

      if (open.some((contract) => contract.team.id === team.id && contract.role === role)) {
        throw new ConflictError(
          `${player.name} already has an open contract with ${team.name} in this role`,
        );
      }

      await mapSequentially(open, async (contract) => {
        contract.close(effectiveDate, input.sourceUrl);
        await contracts.save(contract);
      });

      const contract = new Contract();
      contract.player = player;
      contract.team = team;
      contract.startDate = effectiveDate;
      contract.role = role;
      contract.joinSourceUrl = input.sourceUrl;
      await contracts.save(contract);

      player.team = team;
      player.status = "active";
      await players.save(player);

      return player;
    });
  }

  async leaveTeam(playerId: string, input: LeaveTeamInput): Promise<Player> {
    return await this.transaction.run(async ({ players, contracts }) => {
      const player = requireUnmerged(await players.findById(playerId), playerId);

      const open = await openContracts(contracts, playerId);
      const closed = open.filter((contract) => contract.team.id === input.teamId);

      // Players imported from PandaScore have a current team but no contract row.
      if (closed.length === 0 && player.team?.id !== input.teamId) {
        throw new InvalidInputError(`${player.name} is not on team "${input.teamId}"`);
      }

      await mapSequentially(closed, async (contract) => {
        contract.close(new Date(input.effectiveDate), input.sourceUrl);
        await contracts.save(contract);
      });

      if (player.team?.id === input.teamId) {
        player.team = null;
        player.status = input.status;
      }

      await players.save(player);

      return player;
    });
  }

  async delete(id: string): Promise<void> {
    await this.transaction.run(async ({ players, photos, contracts }) => {
      const player = await players.findById(id);

      if (!player) {
        throw new NotFoundError(`Player with id "${id}" not found`);
      }

      const existingContracts = await contracts.findByPlayer(id);

      await mapSequentially(existingContracts, async (contract) => {
        await contracts.delete(contract);
      });

      const existingPhotos = await photos.findByPlayer(id);

      await mapSequentially(existingPhotos, async (photo) => {
        await photos.delete(photo);
      });

      await players.delete(player);
    });
  }

  async nationalities(): Promise<NationalityCount[]> {
    return await this.players.nationalities();
  }

  async findByNationality(code: string): Promise<Player[]> {
    return await this.players.findByNationality(code);
  }

  async getRandomPlayer(): Promise<Player | null> {
    return await this.players.getRandomPlayer();
  }

  async getPhotos(playerId: string): Promise<PlayerPhoto[]> {
    const player = await this.players.findById(playerId);

    if (!player) {
      throw new NotFoundError(`Player with id "${playerId}" not found`);
    }

    return await this.photos.findByPlayer(playerId);
  }

  async addPhoto(playerId: string, url: string): Promise<PlayerPhoto> {
    return await this.transaction.run(async ({ players, photos }) => {
      const player = await players.findById(playerId);

      if (!player) {
        throw new NotFoundError(`Player with id "${playerId}" not found`);
      }

      const photo = new PlayerPhoto();
      photo.player = player;
      photo.url = url;
      await photos.save(photo);

      return photo;
    });
  }

  async deletePhoto(playerId: string, photoId: string): Promise<void> {
    await this.transaction.run(async ({ photos }) => {
      const photo = await photos.findById(photoId);

      if (!photo || photo.player.id !== playerId) {
        throw new NotFoundError(`Photo with id "${photoId}" not found`);
      }

      await photos.delete(photo);
    });
  }

  async setProfilePhoto(playerId: string, photoId: string): Promise<Player> {
    return await this.transaction.run(async ({ players, photos }) => {
      const player = await players.findById(playerId);

      if (!player) {
        throw new NotFoundError(`Player with id "${playerId}" not found`);
      }

      const photo = await photos.findById(photoId);

      if (!photo || photo.player.id !== playerId) {
        throw new NotFoundError(`Photo with id "${photoId}" not found`);
      }

      const archived = player.replaceProfilePhoto(photo.url);

      if (archived !== null && archived !== "") {
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
