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
import { TeamService } from "./team.service";
import { AdminGuard } from "src/user/user.guard";
import { AuthGuard } from "src/auth/auth.guard";
import { ContractService } from "../player/contract.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { CreateTeamContractDto } from "./dto/create-team-contract.dto";
import { UpdateTeamContractDto } from "./dto/update-team-contract.dto";

@Controller("team")
export class TeamController {
  constructor(
    private teamService: TeamService,
    private contractService: ContractService,
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

    const [teams, count] = await this.teamService.findAndCount({
      name,
      start,
      limit: Math.min(searchLimit, 100),
      offset: searchOffset,
    });

    return {
      teams,
      count,
    };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreateTeamDto) {
    const team = await this.teamService.createFromDto(dto);
    return { team };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const team = await this.teamService.findBySlug(slug);
    return { team };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post("sync")
  async syncPandaScoreTeams() {
    await this.teamService.initializeTeamsFromPandaScore(false);
    return { success: true };
  }

  @Get(":id/former-players")
  async getFormerPlayers(@Param("id") id: string) {
    const team = await this.teamService.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    const contracts = await this.contractService.getFormerPlayersByTeam(id);
    return { contracts };
  }

  @Get(":id/contract")
  async getContracts(@Param("id") id: string) {
    const team = await this.teamService.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    const contracts = await this.contractService.getContractsByTeam(id);
    return { contracts };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(":id/contract")
  async createContract(@Param("id") id: string, @Body() dto: CreateTeamContractDto) {
    const contract = await this.contractService.createForTeam(id, dto);
    return { contract };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id/contract/:contractId")
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body() dto: UpdateTeamContractDto,
  ) {
    const contract = await this.contractService.updateForTeam(id, contractId, dto);
    return { contract };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(":id/contract/:contractId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContract(@Param("id") id: string, @Param("contractId") contractId: string) {
    await this.contractService.deleteForTeam(id, contractId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const team = await this.teamService.findById(id);
    return { team };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateTeamDto) {
    const team = await this.teamService.update(id, dto);
    return { team };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.teamService.delete(id);
  }
}
