import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { PlayerStandIn } from "@sarpbc/types";
import { PlayerService } from "../../application/player.service";
import { ContractService } from "../../application/contract.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { CreatePlayerDto } from "./dto/create-player.dto";
import type { CreatePlayerInput } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import type { UpdatePlayerInput } from "./dto/update-player.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import type { CreateContractInput } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import type { UpdateContractInput } from "./dto/update-contract.dto";
import { AddPlayerPhotoDto } from "./dto/add-player-photo.dto";
import type { AddPlayerPhotoInput } from "./dto/add-player-photo.dto";
import { ListDirectoryQueryDto } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import type { ListDirectoryQueryInput } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import { mapPlayer } from "./player.mapper";
import { mapProfileMatchListItem } from "../../../tournament/infrastructure/http/match-list.mapper";
import { mapTournament } from "../../../tournament/infrastructure/http/tournament.mapper";
import { MatchService } from "../../../tournament/application/match/match.service";
import {
  MatchLineupService,
  lineupSource,
} from "../../../tournament/application/match/match-lineup.service";
import { isRedistributable } from "../../../common/domain/data-source";
import { PlayerAwardService } from "../../../tournament/application/player-award.service";
import { SeasonService } from "../../../season/application/season.service";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import type { TournamentQueries } from "../../../tournament/application/ports";
import { TOURNAMENT_QUERIES } from "../../../tournament/infrastructure/competition-queries.tokens";

@Controller("player")
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly contractService: ContractService,
    private readonly matchService: MatchService,
    @Inject(TOURNAMENT_QUERIES) private readonly tournaments: TournamentQueries,
    private readonly playerAwardService: PlayerAwardService,
    private readonly seasonService: SeasonService,
    private readonly tournamentPrizeService: TournamentPrizeService,
    private readonly lineupService: MatchLineupService,
  ) {}

  @Get()
  async find(@Query({ schema: ListDirectoryQueryDto }) query: ListDirectoryQueryInput) {
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
  async create(@Body({ schema: CreatePlayerDto }) dto: CreatePlayerInput) {
    const player = await this.playerService.create(dto);

    return { player: mapPlayer(player) };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const player = await this.playerService.findBySlug(slug);

    return { player: player ? mapPlayer(player, { includePhotos: true }) : null };
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    return { player: player ? mapPlayer(player) : null };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body({ schema: UpdatePlayerDto }) dto: UpdatePlayerInput) {
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

  @Get(":id/contract")
  async getContracts(@Param("id") id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const contracts = await this.contractService.getContractsByPlayer(player.id);

    return { contracts };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/contract")
  async createContract(
    @Param("id") id: string,
    @Body({ schema: CreateContractDto }) dto: CreateContractInput,
  ) {
    const contract = await this.contractService.create(id, dto);

    return { contract };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id/contract/:contractId")
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body({ schema: UpdateContractDto }) dto: UpdateContractInput,
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

    const contracts = await this.contractService.getOldTeamsByPlayer(player.id);

    return { contracts };
  }

  @Get(":id/trophies")
  async getTrophies(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const trophies = await this.tournaments.getTournamentsWonByPlayer(player.id);

    return { trophies: trophies.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/awards")
  async getAwards(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const [awards, seasonAwards] = await Promise.all([
      this.playerAwardService.findByPlayerId(player.id),
      this.seasonService.awardsOfPlayer(player.id),
    ]);

    return { awards, seasonAwards };
  }

  @Get(":id/earnings")
  async getEarnings(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const earnings = await this.tournamentPrizeService.playerEarnings(player.id, {
      redistributableOnly: false,
    });

    return { earnings };
  }

  @Get(":id/stand-ins")
  async getStandIns(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ standIns: PlayerStandIn[] }> {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const standIns = await this.lineupService.standIns(player.id);

    return {
      standIns: standIns.map(({ participantId, match }) => ({
        participantId,
        startgg: !isRedistributable(lineupSource(match)),
        match: mapProfileMatchListItem(match),
      })),
    };
  }

  @Get(":id/tournaments")
  async getTournaments(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const tournaments = await this.tournaments.getTournamentsByPlayer(player.id);

    return { tournaments: tournaments.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/staff-tournaments")
  async getStaffTournaments(@Param("id", ParseUUIDPipe) id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const contracts = await this.contractService.getStaffContractsByPlayer(player.id);

    const tournaments = await this.tournaments.getTournamentsByTeamTenures(
      contracts.map((contract) => ({
        teamId: contract.team.id,
        from: contract.startDate,
        to: contract.endDate,
      })),
    );

    return { tournaments: tournaments.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/matches")
  async getMatches(@Param("id") id: string) {
    const player = await this.playerService.findById(id);

    if (!player) {
      throw new NotFoundException(`Player with id "${id}" not found`);
    }

    const matches = await this.matchService.getMatchesByPlayer(player.id);

    return { matches: matches.map(mapProfileMatchListItem) };
  }

  @Get(":id/photo")
  async getPhotos(@Param("id") id: string) {
    const photos = await this.playerService.getPhotos(id);

    return { photos };
  }

  @RequirePermissions("players.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/photo")
  async addPhoto(
    @Param("id") id: string,
    @Body({ schema: AddPlayerPhotoDto }) dto: AddPlayerPhotoInput,
  ) {
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
