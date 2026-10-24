import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MATCH_DECIDED, type MatchDecided } from "../../../tournament/application/public";
import { PickemService } from "../application/pickem.service";

@Injectable()
export class MatchDecidedListener {
  constructor(private readonly pickem: PickemService) {}

  @OnEvent(MATCH_DECIDED)
  handle(event: MatchDecided) {
    return this.pickem.autoScoreMatch(event.matchId);
  }
}
