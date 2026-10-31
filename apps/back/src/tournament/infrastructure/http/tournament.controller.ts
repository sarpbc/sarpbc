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
  NotFoundException,
} from "@nestjs/common";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import { CreateMatchDto, SetMatchVodsDto, SetMatchWinnerDto } from "./dto/create-match.dto";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/create-tournament.dto";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { TournamentService } from "../../application/tournament.service";
import { ManualTournamentService } from "../../application/manual-tournament.service";
import { MatchService } from "../../application/match/match.service";
import { PlayerAwardService } from "../../application/player-award.service";
import { CreatePlayerAwardDto } from "./dto/create-player-award.dto";
import { TournamentPrizeService } from "../../application/tournament-prize.service";
import { SetTournamentPrizesDto } from "./dto/set-tournament-prizes.dto";
import { ListTournamentsQueryDto } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import {
  mapProfileMatchListItem,
  mapTournamentMatchListItem,
  withPublicSlug,
} from "./match-list.mapper";
import { mapTournament, mapTournamentDetail, mapTournamentListItem } from "./tournament.mapper";

@Controller("tournaments")
export class TournamentController {
  constructor(
    private tournamentService: TournamentService,
    private manualTournamentService: ManualTournamentService,
    private matchService: MatchService,
    private tournamentRead: CachedTournamentRead,
    private playerAwardService: PlayerAwardService,
    private tournamentPrizeService: TournamentPrizeService,
    private tournamentPrizesRead: CachedTournamentPrizesRead,
  ) {}

  @Get()
  async find(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryDto) {
    const [tournaments, count] = await this.tournamentService.find({
      limit: query.limit,
      offset: query.offset,
      pickems: query.pickems,
      activeOnly: query.activeOnly === true,
    });

    return {
      tournaments: tournaments.map(mapTournamentListItem),
      count,
    };
  }

  @Get("leagues")
  async findLeagues() {
    const leagues = await this.manualTournamentService.findLeagues();
    return { leagues };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("without-matches")
  async findWithoutMatches() {
    const tournaments = await this.tournamentService.findPandascoreWithoutMatches();
    return { tournaments };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post()
  async create(@Body({ schema: CreateTournamentDto }) dto: CreateTournamentDto) {
    const tournament = await this.manualTournamentService.create(dto);
    return { tournament: mapTournamentDetail(tournament) };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const tournament = await this.tournamentRead.findById(id);
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }
    return { tournament };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body({ schema: UpdateTournamentDto }) dto: UpdateTournamentDto,
  ) {
    const tournament = await this.manualTournamentService.update(id, dto);
    return { tournament: mapTournamentDetail(tournament) };
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

    const tournament = await this.tournamentService.syncTournamentByPandascoreId(pandascoreId);
    return {
      success: true,
      tournamentId: tournament.id,
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
    return { matches: matches.map(mapTournamentMatchListItem) };
  }

  @Get(":id/awards")
  async getAwardsByTournament(@Param("id") id: string) {
    const awards = await this.playerAwardService.findByTournamentId(id);
    return { awards };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/awards")
  async createAward(
    @Param("id") tournamentId: string,
    @Body({ schema: CreatePlayerAwardDto }) dto: CreatePlayerAwardDto,
  ) {
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

  @Get(":id/prizes")
  async getPrizes(@Param("id") id: string) {
    return this.tournamentPrizesRead.findByTournamentId(id);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/prizes")
  async setPrizes(
    @Param("id") tournamentId: string,
    @Body({ schema: SetTournamentPrizesDto }) dto: SetTournamentPrizesDto,
  ) {
    return this.tournamentPrizeService.setDistribution(tournamentId, dto.prizes);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/matches")
  async createMatch(
    @Param("id") tournamentId: string,
    @Body({ schema: CreateMatchDto }) matchData: CreateMatchDto,
  ) {
    const match = await this.matchService.upsertMatch(tournamentId, {
      ...matchData,
      beginAt: matchData.beginAt ? new Date(matchData.beginAt) : undefined,
      endAt: matchData.endAt ? new Date(matchData.endAt) : undefined,
    });
    return { match: withPublicSlug(match) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/winner")
  async setMatchWinner(
    @Param("matchId") matchId: string,
    @Body({ schema: SetMatchWinnerDto }) body: SetMatchWinnerDto,
  ) {
    const match = await this.matchService.setMatchWinner(matchId, body.winnerId);
    return { match: withPublicSlug(match) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/vods")
  async setMatchVods(
    @Param("matchId") matchId: string,
    @Body({ schema: SetMatchVodsDto }) body: SetMatchVodsDto,
  ) {
    const match = await this.matchService.setVods(matchId, body.vods);
    return { match: withPublicSlug(match) };
  }

  @Get("player/:playerId")
  async getTournamentsByPlayer(@Param("playerId") playerId: string) {
    const tournaments = await this.tournamentService.getTournamentsByPlayer(playerId);
    return { tournaments: tournaments.map((tournament) => mapTournament(tournament)) };
  }

  @Get("matches/team/:teamId")
  async getMatchesByTeam(@Param("teamId") teamId: string) {
    const matches = await this.matchService.getMatchesByTeam(teamId);
    return { matches: matches.map(mapProfileMatchListItem) };
  }
}
