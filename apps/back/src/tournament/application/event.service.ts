import type { EventQueries } from "./ports";
import type { TournamentListOptions } from "./inputs";
export class EventService {
  constructor(private readonly events: EventQueries) {}
  list(options: TournamentListOptions = {}) {
    return this.events.list(options);
  }
  find(idOrSlug: string) {
    return this.events.find(idOrSlug);
  }
  findStageId(eventSlug: string, stageSlug: string) {
    return this.events.stageId(eventSlug, stageSlug);
  }
}
