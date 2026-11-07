import type { ManualEvent, TournamentEvent as TournamentEventResponse } from "@sarpbc/types";
import type { EventListing } from "../../application/ports";
import { compareStages, isEventSynced, type TournamentEvent } from "../../domain/tournament-event";
import { mapLeague, mapTournamentListItem, type TournamentResponse } from "./tournament.mapper";

type EventStage = Pick<
  TournamentResponse,
  "name" | "beginAt" | "endAt" | "imageUrl" | "prizepool" | "type"
>;

function bound(dates: Array<Date | null>, pick: (...times: number[]) => number): string | null {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));
  return times.length ? new Date(pick(...times)).toISOString() : null;
}

export function mapEvent<Stage extends EventStage>(
  event: TournamentEvent,
  stages: Stage[],
): TournamentEventResponse<Stage> {
  const ordered = [...stages].sort(compareStages);
  const [newest] = ordered;
  // Only the main stage carries the prize pool; its type wins over qualifier stages.
  const main = ordered.find((stage) => stage.prizepool) ?? newest;
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    league: mapLeague(event.league),
    logoUrl: newest?.imageUrl?.trim() || event.league?.imageUrl?.trim() || null,
    prizepool: main?.prizepool || null,
    type: main?.type ?? null,
    beginAt: bound(
      ordered.map((stage) => stage.beginAt),
      Math.min,
    ),
    endAt: bound(
      ordered.map((stage) => stage.endAt),
      Math.max,
    ),
    stages: ordered,
  };
}

export function mapStaffEvent({ event, stages }: EventListing): ManualEvent {
  return {
    ...mapEvent(event, stages.map(mapTournamentListItem)),
    editable: !isEventSynced(event, stages),
  };
}
