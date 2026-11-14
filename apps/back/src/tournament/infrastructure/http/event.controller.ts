import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { TournamentPathResponse, TournamentPlayerStatsResponse } from "@sarpbc/types";
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";
import { NotFoundError } from "../../../common/domain/errors";
import { isRedistributable } from "../../../common/domain/data-source";
import { ListTournamentsQueryDto } from "./dto/list-tournaments-query.dto";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { EventQueries } from "../../application/ports";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { StreamService } from "../../application/stream.service";
import { SetStreamsDto } from "./dto/set-streams.dto";
import { ViewershipService } from "../../application/viewership.service";
import { SetViewershipDto } from "./dto/set-viewership.dto";
import { parseTournamentPath } from "../../domain/tournament-path";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { EVENT_QUERIES } from "../competition-queries.tokens";
import { CreateEventDto, UpdateEventDto } from "./dto/manual-catalog.dto";
import { mapEvent, mapStaffEvent } from "./event.mapper";
import { mapTournamentListItem, type TournamentDetailResponse } from "./tournament.mapper";

const MISSING = "This tournament page does not exist. Check the address or browse all tournaments.";

@Controller("events")
export class EventController {
  constructor(
    @Inject(EVENT_QUERIES) private readonly events: EventQueries,
    private readonly tournamentRead: CachedTournamentRead,
    private readonly catalogService: ManualCatalogService,
    private readonly streamService: StreamService,
    private readonly viewershipService: ViewershipService,
    private readonly playerStatsService: TournamentPlayerStatsService,
  ) {}

  @Get()
  async list(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryDto) {
    const [listings, count] = await this.events.list({
      limit: query.limit,
      offset: query.offset,
      pickems: query.pickems,
      activeOnly: query.activeOnly === true,
    });

    return {
      events: listings.map(({ event, stages }) =>
        mapEvent(event, stages.map(mapTournamentListItem)),
      ),
      count,
    };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("manual")
  async listManual() {
    const listings = await this.catalogService.manualEvents();

    return { events: listings.map(mapStaffEvent) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get("manual/:id")
  async findManual(@Param("id") id: string) {
    return { event: mapStaffEvent(await this.catalogService.findEvent(id)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Post()
  async create(@Body({ schema: CreateEventDto }) dto: CreateEventDto) {
    return { event: mapStaffEvent(await this.catalogService.createEvent(dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body({ schema: UpdateEventDto }) dto: UpdateEventDto) {
    return { event: mapStaffEvent(await this.catalogService.updateEvent(id, dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get(":id/streams")
  async getStreams(@Param("id") id: string) {
    return await this.streamService.find({ kind: "event", id });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/streams")
  async setStreams(@Param("id") id: string, @Body({ schema: SetStreamsDto }) body: SetStreamsDto) {
    return await this.streamService.set({ kind: "event", id }, body.streams, "manual");
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get(":id/viewership")
  async getViewership(@Param("id") id: string) {
    return await this.viewershipService.find({ kind: "event", id });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/viewership")
  async setViewership(
    @Param("id") id: string,
    @Body({ schema: SetViewershipDto }) body: SetViewershipDto,
  ) {
    return await this.viewershipService.set({ kind: "event", id }, body.viewership);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.catalogService.deleteEvent(id);
  }

  @Get(":event/player-stats")
  async playerStats(@Param("event") event: string): Promise<TournamentPlayerStatsResponse> {
    const found = await this.events.find(event);

    if (found?.stages.some((stage) => isRedistributable(stage.source)) !== true) {
      throw new NotFoundError(MISSING);
    }

    return await this.playerStatsService.forStages(found.stages);
  }

  @Get("resolve/:event")
  async resolveEvent(@Param("event") event: string): Promise<TournamentPathResponse> {
    return await this.resolve([event]);
  }

  @Get("resolve/:event/:stage")
  async resolveStage(
    @Param("event") event: string,
    @Param("stage") stage: string,
  ): Promise<TournamentPathResponse> {
    return await this.resolve([event, stage]);
  }

  private async resolve(segments: string[]): Promise<TournamentPathResponse> {
    const path = parseTournamentPath(segments);

    if (!path) throw new NotFoundError(MISSING);

    switch (path.kind) {
      case "legacyStage":
        return { kind: "stage", tournament: await this.stage(path.id), tab: path.tab };
      case "stage": {
        const id = await this.events.stageId(path.eventSlug, path.stageSlug);

        if (id === null || id === "") throw new NotFoundError(MISSING);

        return { kind: "stage", tournament: await this.stage(id), tab: "overview" };
      }

      case "event": {
        const found = await this.events.find(path.eventSlug);

        // An event left empty by moving its stages elsewhere stays stored but is not public.
        if (found?.stages.length === undefined || found?.stages.length === 0)
          throw new NotFoundError(MISSING);
        const stages = await Promise.all(found.stages.map(async ({ id }) => await this.stage(id)));

        return {
          kind: "event",
          event: { ...mapEvent(found.event, stages), viewership: found.event.viewership },
        };
      }

      default: {
        const unreachable: never = path;

        return unreachable;
      }
    }
  }

  private async stage(id: string): Promise<TournamentDetailResponse> {
    const tournament = await this.tournamentRead.findById(id);

    if (!tournament) throw new NotFoundError(MISSING);

    return tournament;
  }
}
