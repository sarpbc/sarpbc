import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Put,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
} from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { CreateMatchDto, SetMatchWinnerDto } from "./dto/create-match.dto";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/create-tournament.dto";
import { AuthGuard } from "src/auth/auth.guard";
import { RequirePermissions } from "src/user/decorator/require-permissions.decorator";
import { PermissionGuard } from "src/user/user.guard";
import { TournamentService } from "./tournament.service";
import { ManualTournamentService } from "./manual-tournament.service";
import { MatchService } from "./match/match.service";
import { PlayerAwardService } from "./player-award.service";
import { CreatePlayerAwardDto } from "./dto/create-player-award.dto";

@Controller("tournaments")
export class TournamentController {
  constructor(
    private tournamentService: TournamentService,
    private manualTournamentService: ManualTournamentService,
    private matchService: MatchService,
    private redisService: RedisService,
    private playerAwardService: PlayerAwardService,
  ) {}

  @Get()
  async find(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("pickems") pickems?: string,
    @Query("activeOnly") activeOnly?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    const [tournaments, count] = await this.tournamentService.find({
      limit: Math.min(searchLimit, 100),
      offset: searchOffset,
      pickems: pickems ? pickems === "true" : undefined,
      activeOnly: activeOnly === "true",
    });

    return { tournaments, count };
  }

  @Get("leagues")
  async findLeagues() {
    const leagues = await this.manualTournamentService.findLeagues();
    return { leagues };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post()
  async create(@Body() dto: CreateTournamentDto) {
    const tournament = await this.manualTournamentService.create(dto);
    return { tournament };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const cacheKey = `tournament:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { tournament: JSON.parse(cached) };
    }
    const tournament = await this.tournamentService.findById(id);
    await this.redisService.set(cacheKey, JSON.stringify(tournament), 60); // 60 seconds
    return { tournament };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateTournamentDto) {
    const tournament = await this.manualTournamentService.update(id, dto);
    return { tournament };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("sync/additions")
  async syncPandascoreAdditions() {
    const sync = await this.tournamentService.syncNewTournamentsFromPandascore();
    return { success: true, sync };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("sync/pandascore/:pandascoreId")
  async syncTournamentByPandascoreId(@Param("pandascoreId", ParseIntPipe) pandascoreId: number) {
    if (pandascoreId <= 0) {
      throw new BadRequestException("pandascoreId must be a positive integer");
    }

    const tournamentId = await this.tournamentService.syncTournamentByPandascoreId(pandascoreId);
    return {
      success: true,
      tournamentId,
      pandascoreId,
    };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/sync")
  async syncTournamentFromPandascore(@Param("id") id: string) {
    await this.tournamentService.syncTournamentFromPandascore(id);
    return {
      success: true,
    };
  }

  @Post(":tournamentId/enable-pickems")
  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  async setPickemsEnabled(
    @Param("tournamentId") tournamentId: string,
    @Body("enabled") enabled: boolean,
  ) {
    await this.tournamentService.setTournamentPickemsEnabled(tournamentId, enabled);
    return { success: true };
  }

  @Get(":id/matches")
  async getMatchesByTournament(@Param("id") id: string) {
    const matches = await this.matchService.getMatchesByTournament(id);
    return { matches };
  }

  @Get(":id/awards")
  async getAwardsByTournament(@Param("id") id: string) {
    const awards = await this.playerAwardService.findByTournamentId(id);
    return { awards };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/awards")
  async createAward(@Param("id") tournamentId: string, @Body() dto: CreatePlayerAwardDto) {
    const award = await this.playerAwardService.create(
      tournamentId,
      dto.participantId,
      dto.playerId,
      dto.awardType,
    );
    return { award };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id/awards/:awardId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAward(@Param("id") tournamentId: string, @Param("awardId") awardId: string) {
    await this.playerAwardService.delete(tournamentId, awardId);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/matches")
  async createMatch(@Param("id") tournamentId: string, @Body() matchData: CreateMatchDto) {
    const match = await this.matchService.upsertMatch(tournamentId, {
      ...matchData,
      beginAt: matchData.beginAt ? new Date(matchData.beginAt) : undefined,
      endAt: matchData.endAt ? new Date(matchData.endAt) : undefined,
    });
    return { match };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/winner")
  async setMatchWinner(@Param("matchId") matchId: string, @Body() body: SetMatchWinnerDto) {
    const match = await this.matchService.setMatchWinner(matchId, body.winnerId);
    return { match };
  }

  @Get("player/:playerId")
  async getTournamentsByPlayer(@Param("playerId") playerId: string) {
    const tournaments = await this.tournamentService.getTournamentsByPlayer(playerId);
    return { tournaments };
  }

  @Get("matches/player/:playerId")
  async getMatchesByPlayer(@Param("playerId") playerId: string) {
    const matches = await this.matchService.getMatchesByPlayer(playerId);
    return { matches };
  }

  @Get("matches/team/:teamId")
  async getMatchesByTeam(@Param("teamId") teamId: string) {
    const matches = await this.matchService.getMatchesByTeam(teamId);
    return { matches };
  }
}
