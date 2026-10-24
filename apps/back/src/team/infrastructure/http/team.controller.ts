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
import { TeamService } from "../../application/team.service";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { ContractService } from "../../../player/application/contract.service";
import { TournamentService } from "../../../tournament/application/tournament.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { CreateTeamContractDto } from "./dto/create-team-contract.dto";
import { UpdateTeamContractDto } from "./dto/update-team-contract.dto";
import { ListDirectoryQueryDto } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import { mapTeam } from "../../../player/infrastructure/http/player.mapper";
import { mapTournament } from "../../../tournament/infrastructure/http/tournament.mapper";

@Controller("team")
export class TeamController {
  constructor(
    private teamService: TeamService,
    private contractService: ContractService,
    private tournamentService: TournamentService,
  ) {}

  @Get()
  async find(@Query({ schema: ListDirectoryQueryDto }) query: ListDirectoryQueryDto) {
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
  async create(@Body({ schema: CreateTeamDto }) dto: CreateTeamDto) {
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
    await this.teamService.initializeTeamsFromPandaScore(false);
    return { success: true };
  }

  @Get(":id/trophies")
  async getTrophies(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    const trophies = await this.tournamentService.getTournamentsWonByTeam(team.id);
    return { trophies: trophies.map((tournament) => mapTournament(tournament)) };
  }

  @Get(":id/tournaments")
  async getTournaments(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    const tournaments = await this.tournamentService.getTournamentsByTeam(team.id);
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
    @Body({ schema: CreateTeamContractDto }) dto: CreateTeamContractDto,
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
    @Body({ schema: UpdateTeamContractDto }) dto: UpdateTeamContractDto,
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

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);
    return { team: team ? mapTeam(team) : null };
  }

  @RequirePermissions("teams.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body({ schema: UpdateTeamDto }) dto: UpdateTeamDto) {
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
