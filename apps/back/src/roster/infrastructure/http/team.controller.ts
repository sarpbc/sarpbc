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
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TeamService } from "../../application/team.service";
import { TeamAliasService } from "../../application/team-alias.service";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { ContractService } from "../../application/contract.service";
import { SyncPandascoreTeamsUseCase } from "../../application/sync-pandascore-teams.use-case";
import { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import type { TournamentQueries } from "../../../tournament/application/ports";
import { TOURNAMENT_QUERIES } from "../../../tournament/infrastructure/competition-queries.tokens";
import { CreateTeamDto } from "./dto/create-team.dto";
import type { CreateTeamInput } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import type { UpdateTeamInput } from "./dto/update-team.dto";
import { TeamAliasDto } from "./dto/team-alias.dto";
import type { TeamAliasInput } from "./dto/team-alias.dto";
import { CreateTeamContractDto } from "./dto/create-team-contract.dto";
import type { CreateTeamContractInput } from "./dto/create-team-contract.dto";
import { UpdateTeamContractDto } from "./dto/update-team-contract.dto";
import type { UpdateTeamContractInput } from "./dto/update-team-contract.dto";
import { ListDirectoryQueryDto } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import type { ListDirectoryQueryInput } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import { mapTeam, mapTeamAlias } from "./player.mapper";
import { mapTournament } from "../../../tournament/infrastructure/http/tournament.mapper";

@Controller("team")
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamAliasService: TeamAliasService,
    private readonly contractService: ContractService,
    @Inject(TOURNAMENT_QUERIES) private readonly tournaments: TournamentQueries,
    private readonly tournamentPrizeService: TournamentPrizeService,
    private readonly syncPandascoreTeams: SyncPandascoreTeamsUseCase,
  ) {}

  @Get()
  async find(@Query({ schema: ListDirectoryQueryDto }) query: ListDirectoryQueryInput) {
    const [teams, count] = await this.teamService.findAndCount({
      name: query.name,
      start: query.start,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      teams: teams.map((team) => mapTeam(team)),
      count,
    };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post()
  async create(@Body({ schema: CreateTeamDto }) dto: CreateTeamInput) {
    const team = await this.teamService.create(dto);

    return { team: mapTeam(team) };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const team = await this.teamService.findBySlug(slug);

    return { team: team ? mapTeam(team) : null };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("sync")
  async syncPandaScoreTeams() {
    await this.syncPandascoreTeams.sync();

    return { success: true };
  }

  @Get(":id/trophies")
  async getTrophies(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);

    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const trophies = await this.tournaments.getTournamentsWonByTeam(team.id);

    return { trophies: trophies.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/earnings")
  async getEarnings(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);

    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const earnings = await this.tournamentPrizeService.teamEarnings(team.id, {
      redistributableOnly: false,
    });

    return { earnings };
  }

  @Get(":id/tournaments")
  async getTournaments(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);

    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const tournaments = await this.tournaments.getTournamentsByTeam(team.id);

    return { tournaments: tournaments.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/former-players")
  async getFormerPlayers(@Param("id") id: string) {
    const team = await this.teamService.findById(id);

    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const contracts = await this.contractService.getFormerPlayersByTeam(team.id);

    return { contracts };
  }

  @Get(":id/contract")
  async getContracts(@Param("id") id: string) {
    const team = await this.teamService.findById(id);

    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const contracts = await this.contractService.getContractsByTeam(team.id);

    return { contracts };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/contract")
  async createContract(
    @Param("id") id: string,
    @Body({ schema: CreateTeamContractDto }) dto: CreateTeamContractInput,
  ) {
    const contract = await this.contractService.createForTeam(id, dto);

    return { contract };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id/contract/:contractId")
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body({ schema: UpdateTeamContractDto }) dto: UpdateTeamContractInput,
  ) {
    const contract = await this.contractService.updateForTeam(id, contractId, dto);

    return { contract };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id/contract/:contractId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContract(@Param("id") id: string, @Param("contractId") contractId: string) {
    await this.contractService.deleteForTeam(id, contractId);
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/aliases")
  async addAlias(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: TeamAliasDto }) dto: TeamAliasInput,
  ) {
    return { alias: mapTeamAlias(await this.teamAliasService.add(id, dto)) };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/aliases/:aliasId")
  async updateAlias(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("aliasId", ParseUUIDPipe) aliasId: string,
    @Body({ schema: TeamAliasDto }) dto: TeamAliasInput,
  ) {
    return { alias: mapTeamAlias(await this.teamAliasService.update(id, aliasId, dto)) };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id/aliases/:aliasId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlias(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("aliasId", ParseUUIDPipe) aliasId: string,
  ) {
    await this.teamAliasService.delete(id, aliasId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);

    return { team: team ? mapTeam(team) : null };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body({ schema: UpdateTeamDto }) dto: UpdateTeamInput) {
    const team = await this.teamService.update(id, dto);

    return { team: mapTeam(team) };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.teamService.delete(id);
  }
}
