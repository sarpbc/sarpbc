import type { TournamentEventRef } from "@sarpbc/types";
import type { MatchLinkTarget } from "~/types/matches";
import {
  isNonEmptyDateInput,
  isNonEmptyString,
  tournamentStageLabel,
  type NamedParticipant,
} from "@sarpbc/utils";
import { slotName } from "~/utils/participantSlot";
import { TBD_LABEL } from "~/utils/tbdLabel";
import { matchEndAt, matchEventUid, matchPageUrl, type CalendarEvent } from "./ics";

interface CalendarMatch extends MatchLinkTarget {
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
  numberOfGames?: number | null;
  participants?: NamedParticipant[];
}

function slotLabel(match: CalendarMatch, index: 0 | 1): string {
  const name = slotName(match.participants, index)?.trim();

  return isNonEmptyString(name) ? name : TBD_LABEL;
}

export function isMatchOnCalendar(match: {
  beginAt?: Date | string | null;
  status?: string | null;
}): boolean {
  if (!isNonEmptyDateInput(match.beginAt)) {
    return false;
  }

  return match.status !== "finished";
}

export function matchToCalendarEvent(
  match: CalendarMatch,
  stage: { name: string; event: TournamentEventRef },
  dtStamp: Date,
): CalendarEvent | null {
  if (!isNonEmptyDateInput(match.beginAt)) {
    return null;
  }

  const beginAt = new Date(match.beginAt);
  const endAt = isNonEmptyDateInput(match.endAt) ? new Date(match.endAt) : undefined;
  const teamA = slotLabel(match, 0);
  const teamB = slotLabel(match, 1);
  const url = matchPageUrl(match);

  return {
    uid: matchEventUid(match.id),
    summary: `${teamA} vs ${teamB}`,
    description: `${tournamentStageLabel(stage)}\n${url}`,
    url,
    dtStart: beginAt,
    dtEnd: matchEndAt(beginAt, endAt, match.numberOfGames ?? undefined),
    dtStamp,
  };
}
