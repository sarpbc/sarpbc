import type { ManualEvent, TournamentEvent as TournamentEventResponse } from "@sarpbc/types";
import type { EventListing } from "../../application/ports";
import { nonBlank } from "../../../common/domain/text";
import { compareStages, isEventSynced } from "../../domain/tournament-event";
import type { TournamentEvent } from "../../domain/tournament-event";
import { mapLeague, mapTournamentListItem } from "./tournament.mapper";
import type { TournamentResponse } from "./tournament.mapper";

type EventStage = Pick<
  TournamentResponse,
  "name" | "beginAt" | "endAt" | "imageUrl" | "prizepool" | "type"
>;

const bound = (dates: (Date | null)[], pick: (...times: number[]) => number): string | null => {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));

  return times.length ? new Date(pick(...times)).toISOString() : null;
};

export const mapEvent = <Stage extends EventStage>(
  event: TournamentEvent,
  stages: Stage[],
): TournamentEventResponse<Stage> => {
  const ordered = stages.toSorted(compareStages);
  const [newest] = ordered;

  // Only the main stage carries the prize pool; its type wins over qualifier stages.
  const main =
    ordered.find((stage) => stage.prizepool !== null && stage.prizepool !== "") ?? newest;

  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    league: mapLeague(event.league),
    logoUrl: nonBlank(newest?.imageUrl) ?? nonBlank(event.league?.imageUrl) ?? null,
    prizepool: main?.prizepool === undefined || main.prizepool === "" ? null : main.prizepool,
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
};

export const mapStaffEvent = ({ event, stages }: EventListing): ManualEvent => ({
  ...mapEvent(event, stages.map(mapTournamentListItem)),
  editable: !isEventSynced(event, stages),
});
