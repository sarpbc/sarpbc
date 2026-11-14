import { Injectable } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { CompetitionEvents } from "../application/ports";
import type { MatchDecided } from "../domain/match-decided";

@Injectable()
export class CompetitionEventsAdapter implements CompetitionEvents {
  constructor(private readonly emitter: EventEmitter2) {}
  async publish(event: MatchDecided) {
    await this.emitter.emitAsync(event.type, event);
  }
}
