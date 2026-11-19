import type { TournamentPathResponse, TournamentPlayerStatsResponse } from "@sarpbc/types";
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
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { isRedistributable } from "../../../common/domain/data-source";
import { ListTournamentsQueryDto } from "./dto/list-tournaments-query.dto";
import type { ListTournamentsQueryInput } from "./dto/list-tournaments-query.dto";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { EventQueries } from "../../application/ports";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { StreamService } from "../../application/stream.service";
import { SetStreamsDto } from "./dto/set-streams.dto";
import type { SetStreamsInput } from "./dto/set-streams.dto";
import { ViewershipService } from "../../application/viewership.service";
import { SetViewershipDto } from "./dto/set-viewership.dto";
import type { SetViewershipInput } from "./dto/set-viewership.dto";
import { parseTournamentPath } from "../../domain/tournament-path";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { EVENT_QUERIES } from "../competition-queries.tokens";
import { CreateEventDto, UpdateEventDto } from "./dto/manual-catalog.dto";
import type { CreateEventInput, UpdateEventInput } from "./dto/manual-catalog.dto";
import { mapEvent, mapStaffEvent } from "./event.mapper";
import { mapTournamentListItem } from "./tournament.mapper";

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
  async list(@Query({ schema: ListTournamentsQueryDto }) query: ListTournamentsQueryInput) {
    const [listings, count] = await this.events.list({
      activeOnly: query.activeOnly === true,
      limit: query.limit,
      offset: query.offset,
      pickems: query.pickems,
    });

    return {
      count,
      events: listings.map(({ event, stages }) =>
        mapEvent(event, stages.map(mapTournamentListItem)),
      ),
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
  async create(@Body({ schema: CreateEventDto }) dto: CreateEventInput) {
    return { event: mapStaffEvent(await this.catalogService.createEvent(dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body({ schema: UpdateEventDto }) dto: UpdateEventInput) {
    return { event: mapStaffEvent(await this.catalogService.updateEvent(id, dto)) };
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get(":id/streams")
  async getStreams(@Param("id") id: string) {
    return await this.streamService.find({ id, kind: "event" });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/streams")
  async setStreams(
    @Param("id") id: string,
    @Body({ schema: SetStreamsDto }) body: SetStreamsInput,
  ) {
    return await this.streamService.set({ id, kind: "event" }, body.streams, "manual");
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Get(":id/viewership")
  async getViewership(@Param("id") id: string) {
    return await this.viewershipService.find({ id, kind: "event" });
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Put(":id/viewership")
  async setViewership(
    @Param("id") id: string,
    @Body({ schema: SetViewershipDto }) body: SetViewershipInput,
  ) {
    return await this.viewershipService.set({ id, kind: "event" }, body.viewership);
  }

  @RequirePermissions("tournaments.manage")
  @UseGuards(AuthGuard, PermissionGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.catalogService.deleteEvent(id);
  }

  @Get(":event/player-stats")
  async playerStats(@Param("event") event: string) {
    const found = await this.events.find(event);

    if (found?.stages.some((stage) => isRedistributable(stage.source)) !== true) {
      throw new NotFoundError(MISSING);
    }

    return (await this.playerStatsService.forStages(
      found.stages,
    )) satisfies TournamentPlayerStatsResponse;
  }

  @Get("resolve/:event")
  async resolveEvent(@Param("event") event: string) {
    return (await this.resolve([event])) satisfies TournamentPathResponse;
  }

  @Get("resolve/:event/:stage")
  async resolveStage(@Param("event") event: string, @Param("stage") stage: string) {
    return (await this.resolve([event, stage])) satisfies TournamentPathResponse;
  }

  private async resolve(segments: string[]) {
    const path = parseTournamentPath(segments);

    if (!path) {
      throw new NotFoundError(MISSING);
    }

    switch (path.kind) {
      case "legacyStage": {
        return {
          kind: "stage",
          tab: path.tab,
          tournament: await this.stage(path.id),
        } satisfies TournamentPathResponse;
      }

      case "stage": {
        const id = await this.events.stageId(path.eventSlug, path.stageSlug);

        if (id === null || id === "") {
          throw new NotFoundError(MISSING);
        }

        return {
          kind: "stage",
          tab: "overview",
          tournament: await this.stage(id),
        } satisfies TournamentPathResponse;
      }

      case "event": {
        const found = await this.events.find(path.eventSlug);

        if (found?.stages.length === undefined || found?.stages.length === 0) {
          throw new NotFoundError(MISSING);
        }

        const stages = await Promise.all(found.stages.map(async ({ id }) => await this.stage(id)));

        return {
          event: { ...mapEvent(found.event, stages), viewership: found.event.viewership },
          kind: "event",
        } satisfies TournamentPathResponse;
      }

      default: {
        const unreachable: never = path;

        return unreachable satisfies TournamentPathResponse;
      }
    }
  }

  private async stage(id: string) {
    const tournament = await this.tournamentRead.findById(id);

    if (!tournament) {
      throw new NotFoundError(MISSING);
    }

    return tournament;
  }
}
