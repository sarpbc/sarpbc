import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MATCH_DECIDED, type MatchDecided } from "../../../tournament/domain/match-decided";
import { PickemService } from "../application/pickem.service";

@Injectable()
export class MatchDecidedListener {
  constructor(private readonly pickem: PickemService) {}

  @OnEvent(MATCH_DECIDED)
  async handle(event: MatchDecided) {
    return await this.pickem.autoScoreMatch(event.matchId);
  }
}
