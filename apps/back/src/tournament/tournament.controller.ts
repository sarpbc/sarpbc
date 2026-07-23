import { Controller, Get, Param, Query, Post, Body, Put, UseGuards } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { CreateMatchDto, SetMatchWinnerDto } from "./dto/create-match.dto";
import { AuthGuard } from "src/auth/auth.guard";
import { RequirePermissions } from "src/user/decorator/require-permissions.decorator";
import { PermissionGuard } from "src/user/user.guard";
import { TournamentService } from "./tournament.service";
import { MatchService } from "./match/match.service";

@Controller("tournaments")
export class TournamentController {
  constructor(
    private tournamentService: TournamentService,
    private matchService: MatchService,
    private redisService: RedisService,
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

    const tournaments = await this.tournamentService.find({
      limit: Math.min(searchLimit, 100),
      offset: searchOffset,
      pickems: pickems ? pickems === "true" : undefined,
      activeOnly: activeOnly === "true",
    });

    return { tournaments };
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
  @Post("sync/additions")
  async syncPandascoreAdditions() {
    await this.tournamentService.syncPandascoreAdditions();
    return { success: true };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/sync")
  async syncTournamentFromPandascore(@Param("id") id: string) {
    await this.tournamentService.syncTournamentFromPandascore(id);
    await this.redisService.delete(`tournament:${id}`);
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
