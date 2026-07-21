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
import { AdminGuard } from "src/user/user.guard";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { AddPlayerPhotoDto } from "./dto/add-player-photo.dto";
import { MatchService } from "src/tournament/match/match.service";

@Controller("player")
export class PlayerController {
  constructor(
    private playerService: PlayerService,
    private contractService: ContractService,
    private matchService: MatchService,
  ) {}

  @Get()
  async find(
    @Query("name") name?: string,
    @Query("start") start?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 25;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    const [players, count] = await this.playerService.findAndCount({
      name,
      start,
      limit: Math.min(searchLimit, 100),
      offset: searchOffset,
    });

    return {
      players,
      count,
    };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreatePlayerDto) {
    const player = await this.playerService.create(dto);
    return { player };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const player = await this.playerService.findBySlug(slug);
    return { player };
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);
    return { player };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdatePlayerDto) {
    const player = await this.playerService.update(id, dto);
    return { player };
  }

  @UseGuards(AuthGuard, AdminGuard)
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

  @UseGuards(AuthGuard, AdminGuard)
  @Post(":id/contract")
  async createContract(@Param("id") id: string, @Body() dto: CreateContractDto) {
    const contract = await this.contractService.create(id, dto);
    return { contract };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id/contract/:contractId")
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body() dto: UpdateContractDto,
  ) {
    const contract = await this.contractService.update(id, contractId, dto);
    return { contract };
  }

  @UseGuards(AuthGuard, AdminGuard)
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

  @UseGuards(AuthGuard, AdminGuard)
  @Post(":id/photo")
  async addPhoto(@Param("id") id: string, @Body() dto: AddPlayerPhotoDto) {
    const photo = await this.playerService.addPhoto(id, dto.url);
    return { photo };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(":id/photo/:photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhoto(@Param("id") id: string, @Param("photoId") photoId: string) {
    await this.playerService.deletePhoto(id, photoId);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id/photo/:photoId/set-profile")
  async setProfilePhoto(@Param("id") id: string, @Param("photoId") photoId: string) {
    const player = await this.playerService.setProfilePhoto(id, photoId);
    return { player };
  }
}
