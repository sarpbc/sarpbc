import type { StageTab } from "../../domain/tournament-path";
import { compareStages, type TournamentEvent } from "../../domain/tournament-event";
import {
  mapLeague,
  type LeagueResponse,
  type TournamentDetailResponse,
  type TournamentResponse,
} from "./tournament.mapper";

type EventStage = Pick<
  TournamentResponse,
  "name" | "beginAt" | "endAt" | "imageUrl" | "prizepool" | "type"
>;

export interface EventListItemResponse<Stage extends EventStage> {
  id: string;
  slug: string;
  name: string;
  league: LeagueResponse | null;
  logoUrl: string | null;
  prizepool: string | null;
  type: string | null;
  beginAt: Date | null;
  endAt: Date | null;
  stages: Stage[];
}

export type EventDetailResponse = EventListItemResponse<TournamentDetailResponse>;

export type TournamentPathResponse =
  | { kind: "event"; event: EventDetailResponse }
  | { kind: "stage"; tournament: TournamentDetailResponse; tab: StageTab };

function bound(dates: Array<Date | null>, pick: (...times: number[]) => number): Date | null {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));
  return times.length ? new Date(pick(...times)) : null;
}

export function mapEvent<Stage extends EventStage>(
  event: TournamentEvent,
  stages: Stage[],
): EventListItemResponse<Stage> {
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
