import type { EventQueries } from "./ports";
import type { TournamentListOptions } from "./inputs";
export class EventService {
  constructor(private readonly events: EventQueries) {}
  list(options: TournamentListOptions = {}) {
    return this.events.list(options);
  }
  findBySlug(slug: string) {
    return this.events.bySlug(slug);
  }
  findStageId(eventSlug: string, stageSlug: string) {
    return this.events.stageId(eventSlug, stageSlug);
  }
}
