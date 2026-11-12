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
  Inject,
} from "@nestjs/common";
import type { MatchLineupsResponse } from "@sarpbc/types";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import {
  CreateEmptyBracketDto,
  CreateMatchDto,
  SetMatchBracketDto,
  SetMatchVodsDto,
  SetMatchWinnerDto,
} from "./dto/create-match.dto";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/create-tournament.dto";
import { CreateLeagueDto, UpdateLeagueDto } from "./dto/manual-catalog.dto";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { TournamentQueries } from "../../application/ports";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { TOURNAMENT_QUERIES } from "../competition-queries.tokens";
import { ManualTournamentService } from "../../application/manual-tournament.service";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { MatchService } from "../../application/match/match.service";
import { StreamService } from "../../application/stream.service";
import { SetStreamsDto } from "./dto/set-streams.dto";
import {
  MatchLineupService,
  type MatchLineups,
} from "../../application/match/match-lineup.service";
import { lineupsFromGames } from "../../domain/match-lineup";
import { SetMatchLineupsDto } from "./dto/set-match-lineups.dto";
import type { GameStatsStore } from "../../../match-stats/application/ports";
import { GAME_STATS_STORE } from "../../../match-stats/infrastructure/game-stats.tokens";
import { ViewershipService } from "../../application/viewership.service";
import { SetViewershipDto } from "./dto/set-viewership.dto";
import { PlayerAwardService } from "../../application/player-award.service";
import { CreatePlayerAwardDto } from "./dto/create-player-award.dto";
import { TournamentPrizeService } from "../../application/tournament-prize.service";
import { SetTournamentPrizesDto } from "./dto/set-tournament-prizes.dto";
import { ListTournamentsQueryDto } from "./dto/list-tournaments-query.dto";
import {
  mapProfileMatchListItem,
  mapTournamentMatchListItem,
  withPublicSlug,
} from "./match-list.mapper";
import {
  mapLeague,
  mapTournament,
  mapTournamentDetail,
  mapTournamentListItem,
} from "./tournament.mapper";

@Controller("tournaments")
export class TournamentController {
  constructor(
    @Inject(TOURNAMENT_QUERIES) private tournaments: TournamentQueries,
    private syncNewTournaments: SyncNewTournamentsUseCase,
    private syncTournaments: SyncPandascoreTournamentUseCase,
    private manualTournamentService: ManualTournamentService,
    private matchService: MatchService,
    private tournamentRead: CachedTournamentRead,
    private playerAwardService: PlayerAwardService,
    private tournamentPrizeService: TournamentPrizeService,
    private tournamentPrizesRead: CachedTournamentPrizesRead,
    private catalogService: ManualCatalogService,
    private streamService: StreamService,
    private lineupService: MatchLineupService,
    @Inject(GAME_STATS_STORE) private gameStats: Pick<GameStatsStore, "byMatch">,
    private viewershipService: ViewershipService,
  ) {}

  @Get()
  async find(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryDto) {
    const [tournaments, count] = await this.tournaments.find({
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
    const leagues = await this.catalogService.leagues();
    return { leagues: leagues.map(mapLeague) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("leagues")
  async createLeague(@Body({ schema: CreateLeagueDto }) dto: CreateLeagueDto) {
    return { league: mapLeague(await this.catalogService.createLeague(dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch("leagues/:leagueId")
  async updateLeague(
    @Param("leagueId") leagueId: string,
    @Body({ schema: UpdateLeagueDto }) dto: UpdateLeagueDto,
  ) {
    return { league: mapLeague(await this.catalogService.updateLeague(leagueId, dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("without-matches")
  async findWithoutMatches() {
    const tournaments = await this.tournaments.findPandascoreWithoutMatches();
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
    const sync = await this.syncNewTournaments.execute();
    return { success: true, sync };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post("sync/pandascore/:pandascoreId")
  async syncTournamentByPandascoreId(@Param("pandascoreId", ParseIntPipe) pandascoreId: number) {
    if (pandascoreId <= 0) {
      throw new BadRequestException("pandascoreId must be a positive integer");
    }

    const tournament = await this.syncTournaments.executeByPandascoreId(pandascoreId);
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
    await this.syncTournaments.execute(id);
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
    await this.manualTournamentService.setPickemsEnabled(tournamentId, enabled);
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
    const match = await this.matchService.createMatch(tournamentId, {
      ...matchData,
      beginAt: matchData.beginAt ? new Date(matchData.beginAt) : undefined,
      endAt: matchData.endAt ? new Date(matchData.endAt) : undefined,
    });
    return { match: withPublicSlug(match) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post(":id/bracket")
  async createEmptyBracket(
    @Param("id") tournamentId: string,
    @Body({ schema: CreateEmptyBracketDto }) body: CreateEmptyBracketDto,
  ) {
    const matches = await this.matchService.createEmptyBracket(tournamentId, body);
    return { matches: matches.map(mapTournamentMatchListItem) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/bracket")
  async setMatchBracket(
    @Param("matchId") matchId: string,
    @Body({ schema: SetMatchBracketDto }) body: SetMatchBracketDto,
  ) {
    const match = await this.matchService.updateMatch(matchId, body);
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

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("matches/:matchId/streams")
  getMatchStreams(@Param("matchId") matchId: string) {
    return this.streamService.find({ kind: "match", id: matchId });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/streams")
  setMatchStreams(
    @Param("matchId") matchId: string,
    @Body({ schema: SetStreamsDto }) body: SetStreamsDto,
  ) {
    return this.streamService.set({ kind: "match", id: matchId }, body.streams, "manual");
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("matches/:matchId/lineups")
  getMatchLineups(@Param("matchId") matchId: string): Promise<MatchLineupsResponse> {
    return this.lineupsResponse(matchId, this.lineupService.find(matchId));
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("matches/:matchId/viewership")
  getMatchViewership(@Param("matchId") matchId: string) {
    return this.viewershipService.find({ kind: "match", id: matchId });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/lineups")
  setMatchLineups(
    @Param("matchId") matchId: string,
    @Body({ schema: SetMatchLineupsDto }) body: SetMatchLineupsDto,
  ): Promise<MatchLineupsResponse> {
    return this.lineupsResponse(matchId, this.lineupService.set(matchId, body.lineups));
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put("matches/:matchId/viewership")
  setMatchViewership(
    @Param("matchId") matchId: string,
    @Body({ schema: SetViewershipDto }) body: SetViewershipDto,
  ) {
    return this.viewershipService.set({ kind: "match", id: matchId }, body.viewership);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get(":id/streams")
  getTournamentStreams(@Param("id") id: string) {
    return this.streamService.find({ kind: "tournament", id });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/streams")
  setTournamentStreams(
    @Param("id") id: string,
    @Body({ schema: SetStreamsDto }) body: SetStreamsDto,
  ) {
    return this.streamService.set({ kind: "tournament", id }, body.streams, "manual");
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete("matches/:matchId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMatch(@Param("matchId") matchId: string) {
    await this.matchService.deleteMatch(matchId);
  }

  @Get("player/:playerId")
  async getTournamentsByPlayer(@Param("playerId") playerId: string) {
    const tournaments = await this.tournaments.getTournamentsByPlayer(playerId);
    return { tournaments: tournaments.map((tournament) => mapTournament(tournament)) };
  }

  @Get("matches/team/:teamId")
  async getMatchesByTeam(@Param("teamId") teamId: string) {
    const matches = await this.matchService.getMatchesByTeam(teamId);
    return { matches: matches.map(mapProfileMatchListItem) };
  }

  private async lineupsResponse(
    matchId: string,
    pending: Promise<MatchLineups>,
  ): Promise<MatchLineupsResponse> {
    const lineups = await pending;
    return { ...lineups, suggested: lineupsFromGames(await this.gameStats.byMatch(matchId)) };
  }
}
