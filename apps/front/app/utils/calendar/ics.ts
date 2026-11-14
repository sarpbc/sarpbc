import { matchPath, isNonEmptyString } from "@sarpbc/utils";
import type { MatchLinkTarget } from "~/types/matches";
import { SITE_ORIGIN } from "@sarpbc/ui/config";

const ICS_PROD_ID = "-//sarpbc.org//EN";

const FOLD_OCTETS = 75;
const GAME_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 120;

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  url?: string;
  dtStart: Date;
  dtEnd: Date;
  dtStamp: Date;
}

export interface CalendarFeed {
  name: string;
  events: CalendarEvent[];
  dtStamp: Date;
}

export const tournamentCalendarPath = (id: string): string => `/calendar/tournament/${id}.ics`;

export const matchPageUrl = (match: MatchLinkTarget): string =>
  `${SITE_ORIGIN}${matchPath(match.publicId, match.slug)}`;

export const matchEventUid = (id: string): string => `match-${id}@sarpbc.org`;

const formatIcsUtc = (date: Date): string =>
  date
    .toISOString()
    .replaceAll(/[-:]/gu, "")
    .replace(/\.\d{3}/u, "");

const escapeIcsText = (value: string): string =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");

const foldIcsLine = (line: string): string => {
  const encoder = new TextEncoder();

  if (encoder.encode(line).length <= FOLD_OCTETS) {
    return line;
  }

  const folded: string[] = [];
  let current = "";

  for (const char of line) {
    const next = current + char;

    if (encoder.encode(next).length > FOLD_OCTETS) {
      folded.push(current);
      current = ` ${char}`;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    folded.push(current);
  }

  return folded.join("\r\n");
};

export const matchEndAt = (
  beginAt: Date,
  endAt: Date | undefined,
  numberOfGames: number | undefined,
): Date => {
  if (endAt && endAt.getTime() > beginAt.getTime()) {
    return endAt;
  }

  const minutes =
    numberOfGames !== undefined && numberOfGames !== null && numberOfGames > 0
      ? numberOfGames * GAME_MINUTES
      : DEFAULT_DURATION_MINUTES;

  return new Date(beginAt.getTime() + minutes * 60 * 1000);
};

const eventLines = (event: CalendarEvent): string[] => {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsUtc(event.dtStamp)}`,
    `DTSTART:${formatIcsUtc(event.dtStart)}`,
    `DTEND:${formatIcsUtc(event.dtEnd)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (isNonEmptyString(event.description)) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (isNonEmptyString(event.url)) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT");

  return lines;
};

export const buildIcs = (feed: CalendarFeed): string => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(feed.name)}`,
  ];

  for (const event of feed.events) {
    lines.push(...eventLines(event));
  }

  lines.push("END:VCALENDAR");

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
};
