import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PlayerService } from "./player.service";
import { ContractService } from "./contract.service";
import { AuthGuard } from "src/auth/auth.guard";
import { RequirePermissions } from "src/user/decorator/require-permissions.decorator";
import { PermissionGuard } from "src/user/user.guard";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { AddPlayerPhotoDto } from "./dto/add-player-photo.dto";
import { ListPlayersQueryDto } from "src/common/dto/list-directory-query.dto";
import { mapPlayer } from "./player.mapper";
import { mapTournament } from "src/tournament/tournament.mapper";
import { MatchService } from "src/tournament/match/match.service";
import { TournamentService } from "src/tournament/tournament.service";
import { PlayerAwardService } from "src/tournament/player-award.service";

@Controller("player")
export class PlayerController {
  constructor(
    private playerService: PlayerService,
    private contractService: ContractService,
    private matchService: MatchService,
    private tournamentService: TournamentService,
    private playerAwardService: PlayerAwardService,
  ) {}

  @Get()
  async find(@Query() query: ListPlayersQueryDto) {
    const [players, count] = await this.playerService.findAndCount({
      name: query.name,
      start: query.start,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      players: players.map((player) => mapPlayer(player)),
      count,
    };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post()
  async create(@Body() dto: CreatePlayerDto) {
    const player = await this.playerService.create(dto);
    return { player: mapPlayer(player) };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const player = await this.playerService.findBySlug(slug);
    return { player: player ? mapPlayer(player, { includePhotos: true }) : player };
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);
    return { player: player ? mapPlayer(player) : player };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdatePlayerDto) {
    const player = await this.playerService.update(id, dto);
    return { player: mapPlayer(player) };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.playerService.delete(id);
  }

  // --- Contract endpoints ---

  @Get(":id/contract")
  async getContracts(@Param("id") id: string) {
    const player = await this.playerService.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }
    const contracts = await this.contractService.getContractsByPlayer(id);
    return { contracts };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/contract")
  async createContract(@Param("id") id: string, @Body() dto: CreateContractDto) {
    const contract = await this.contractService.create(id, dto);
    return { contract };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id/contract/:contractId")
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body() dto: UpdateContractDto,
  ) {
    const contract = await this.contractService.update(id, contractId, dto);
    return { contract };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id/contract/:contractId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContract(@Param("id") id: string, @Param("contractId") contractId: string) {
    await this.contractService.delete(id, contractId);
  }

  @Get(":id/old-teams")
  async getOldTeams(@Param("id") id: string) {
    const player = await this.playerService.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }
    const contracts = await this.contractService.getOldTeamsByPlayer(id);
    return { contracts };
  }

  // --- Trophy endpoints ---

  @Get(":id/trophies")
  async getTrophies(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }
    const trophies = await this.tournamentService.getTournamentsWonByPlayer(id);
    return { trophies: trophies.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/awards")
  async getAwards(@Param("id", ParseUUIDPipe) id: string) {
    const awards = await this.playerAwardService.findByPlayerId(id);
    return { awards };
  }

  // --- Match endpoints ---

  @Get(":id/matches")
  async getMatches(@Param("id") id: string) {
    const player = await this.playerService.findById(id);
    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }
    const matches = await this.matchService.getMatchesByPlayer(id);
    return { matches };
  }

  // --- Photo endpoints ---

  @Get(":id/photo")
  async getPhotos(@Param("id") id: string) {
    const photos = await this.playerService.getPhotos(id);
    return { photos };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/photo")
  async addPhoto(@Param("id") id: string, @Body() dto: AddPlayerPhotoDto) {
    const photo = await this.playerService.addPhoto(id, dto.url);
    return { photo };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id/photo/:photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhoto(@Param("id") id: string, @Param("photoId") photoId: string) {
    await this.playerService.deletePhoto(id, photoId);
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id/photo/:photoId/set-profile")
  async setProfilePhoto(@Param("id") id: string, @Param("photoId") photoId: string) {
    const player = await this.playerService.setProfilePhoto(id, photoId);
    return { player: mapPlayer(player) };
  }
}
