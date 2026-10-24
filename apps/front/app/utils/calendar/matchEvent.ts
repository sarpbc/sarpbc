import type { TournamentEventRef } from "@sarpbc/types";
import type { MatchLinkTarget } from "~/types/matches";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";
import { matchEndAt, matchEventUid, matchPageUrl, type CalendarEvent } from "./ics";

interface CalendarMatch extends MatchLinkTarget {
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
  numberOfGames?: number | null;
  participants?: { team: { name: string } }[];
}

function participantName(match: CalendarMatch, index: 0 | 1): string {
  return match.participants?.[index]?.team.name?.trim() || "TBD";
}

export function isMatchOnCalendar(match: {
  beginAt?: Date | string | null;
  status?: string | null;
}): boolean {
  if (!match.beginAt) {
    return false;
  }
  return match.status !== "finished";
}

export function matchToCalendarEvent(
  match: CalendarMatch,
  stage: { name: string; event: TournamentEventRef },
  dtStamp: Date,
): CalendarEvent | null {
  if (!match.beginAt) {
    return null;
  }

  const beginAt = new Date(match.beginAt);
  const endAt = match.endAt ? new Date(match.endAt) : undefined;
  const teamA = participantName(match, 0);
  const teamB = participantName(match, 1);
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
