import type { StageTab } from "../../domain/tournament-path";
import { compareStages, type TournamentEvent } from "../../domain/tournament-event";
import { mapLeague, type LeagueResponse, type TournamentResponse } from "./tournament.mapper";

export interface EventListItemResponse {
  id: string;
  slug: string;
  name: string;
  league: LeagueResponse | null;
  logoUrl: string | null;
  prizepool: string | null;
  type: string | null;
  beginAt: Date | null;
  endAt: Date | null;
  stages: TournamentResponse[];
}

export type EventDetailResponse = EventListItemResponse;

export type TournamentPathResponse =
  | { kind: "event"; event: EventDetailResponse }
  | { kind: "stage"; tournament: TournamentResponse; tab: StageTab };

function bound(dates: Array<Date | null>, pick: (...times: number[]) => number): Date | null {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));
  return times.length ? new Date(pick(...times)) : null;
}

export function mapEvent(
  event: TournamentEvent,
  stages: TournamentResponse[],
): EventListItemResponse {
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
