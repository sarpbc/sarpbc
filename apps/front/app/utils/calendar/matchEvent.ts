import type { Match } from "~/types/matches";
import { tournamentStageLabel } from "~/utils/tournamentStageLabel";
import { matchEndAt, matchEventUid, matchPageUrl, type CalendarEvent } from "./ics";

function participantName(match: Match, index: 0 | 1): string {
  return match.participants?.[index]?.team.name?.trim() || "TBD";
}

export function isMatchOnCalendar(match: Pick<Match, "beginAt" | "status">): boolean {
  if (!match.beginAt) {
    return false;
  }
  return match.status !== "finished";
}

export function matchToCalendarEvent(match: Match, dtStamp: Date): CalendarEvent | null {
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
    description: `${tournamentStageLabel(match.tournament)}\n${url}`,
    url,
    dtStart: beginAt,
    dtEnd: matchEndAt(beginAt, endAt, match.numberOfGames),
    dtStamp,
  };
}
