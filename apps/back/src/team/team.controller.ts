import { Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import { TeamService } from "./team.service";
import { AdminGuard } from "src/user/user.guard";
import { AuthGuard } from "src/auth/auth.guard";
import { ContractService } from "../player/contract.service";

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

  @Get(":id/former-players")
  async getFormerPlayers(@Param("id") id: string) {
    const team = await this.teamService.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    const contracts = await this.contractService.getFormerPlayersByTeam(id);
    return { contracts };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const team = await this.teamService.findById(id);
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
}
