import type { TournamentEvent } from "../domain/tournament-event";
import type { EventListing } from "./ports";

/** Event read port over `listings`, falling back to events saved through the write port. */
export const memoryEventQueries = (written: { events: Map<string, TournamentEvent> }) => {
  const listings: EventListing[] = [];

  const find = async (idOrSlug: string) => {
    const listed = listings.find(({ event }) => event.id === idOrSlug || event.slug === idOrSlug);

    if (listed) {
      return listed;
    }

    const saved = [...written.events.values()].find(
      (event) => event.id === idOrSlug || event.slug === idOrSlug,
    );

    return saved ? { event: saved, stages: [] } : null;
  };

  return {
    find,
    list: async () => {
      const page: [EventListing[], number] = [listings, listings.length];

      return page;
    },
    listings,
    stageId: async (eventSlug: string, stageSlug: string) =>
      listings
        .find(({ event }) => event.slug === eventSlug)
        ?.stages.find((stage) => stage.slug === stageSlug)?.id ?? null,
    unsynced: async () => listings,
  };
};
