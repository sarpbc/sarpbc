import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { NotFoundError } from "../../../common/domain/errors";
import { ListTournamentsQueryDto } from "./dto/list-tournaments-query.dto";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { EventService } from "../../application/event.service";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { parseTournamentPath } from "../../domain/tournament-path";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CreateEventDto, UpdateEventDto } from "./dto/manual-catalog.dto";
import { mapEvent, mapStaffEvent, type TournamentPathResponse } from "./event.mapper";
import { mapTournamentListItem, type TournamentDetailResponse } from "./tournament.mapper";

const MISSING = "This tournament page does not exist. Check the address or browse all tournaments.";

@Controller("events")
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly tournamentRead: CachedTournamentRead,
    private readonly catalogService: ManualCatalogService,
  ) {}

  @Get()
  async list(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryDto) {
    const [listings, count] = await this.eventService.list({
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

  @Get("resolve/:event")
  resolveEvent(@Param("event") event: string): Promise<TournamentPathResponse> {
    return this.resolve([event]);
  }

  @Get("resolve/:event/:stage")
  resolveStage(
    @Param("event") event: string,
    @Param("stage") stage: string,
  ): Promise<TournamentPathResponse> {
    return this.resolve([event, stage]);
  }

  private async resolve(segments: string[]): Promise<TournamentPathResponse> {
    const path = parseTournamentPath(segments);
    if (!path) throw new NotFoundError(MISSING);
    switch (path.kind) {
      case "legacyStage":
        return { kind: "stage", tournament: await this.stage(path.id), tab: path.tab };
      case "stage": {
        const id = await this.eventService.findStageId(path.eventSlug, path.stageSlug);
        if (!id) throw new NotFoundError(MISSING);
        return { kind: "stage", tournament: await this.stage(id), tab: "overview" };
      }
      case "event": {
        const found = await this.eventService.find(path.eventSlug);
        // An event left empty by moving its stages elsewhere stays stored but is not public.
        if (!found?.stages.length) throw new NotFoundError(MISSING);
        const stages = await Promise.all(found.stages.map(({ id }) => this.stage(id)));
        return { kind: "event", event: mapEvent(found.event, stages) };
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
