import { Controller, Get, Param, Query } from "@nestjs/common";
import { NotFoundError } from "../../../common/domain/errors";
import { ListTournamentsQueryDto } from "../../../common/infrastructure/http/dto/list-directory-query.dto";
import { EventService } from "../../application/event.service";
import { parseTournamentPath } from "../../domain/tournament-path";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { mapEvent, type TournamentPathResponse } from "./event.mapper";
import { mapTournamentListItem, type TournamentDetailResponse } from "./tournament.mapper";

const MISSING = "This tournament page does not exist. Check the address or browse all tournaments.";

@Controller("events")
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly tournamentRead: CachedTournamentRead,
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
        const found = await this.eventService.findBySlug(path.eventSlug);
        if (!found) throw new NotFoundError(MISSING);
        const stages = await Promise.all(found.stageIds.map((id) => this.stage(id)));
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
