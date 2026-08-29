/** RFC 5545: fold lines at 75 octets; escape TEXT values. */

export const ICS_PROD_ID = "-//sarpbc.org//EN";
export const SITE_ORIGIN = "https://sarpbc.org";

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

export function matchCalendarPath(id: string): string {
  return `/calendar/match/${id}.ics`;
}

export function tournamentCalendarPath(id: string): string {
  return `/calendar/tournament/${id}.ics`;
}

export function matchPageUrl(id: string): string {
  return `${SITE_ORIGIN}/matches/${id}`;
}

export function matchEventUid(id: string): string {
  return `match-${id}@sarpbc.org`;
}

export function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= FOLD_OCTETS) {
    return line;
  }

  const chars = [...line];
  const folded: string[] = [];
  let current = "";

  for (const char of chars) {
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
}

export function matchEndAt(
  beginAt: Date,
  endAt: Date | undefined,
  numberOfGames: number | undefined,
): Date {
  if (endAt && endAt.getTime() > beginAt.getTime()) {
    return endAt;
  }

  const minutes =
    numberOfGames != null && numberOfGames > 0
      ? numberOfGames * GAME_MINUTES
      : DEFAULT_DURATION_MINUTES;

  return new Date(beginAt.getTime() + minutes * 60 * 1000);
}

function eventLines(event: CalendarEvent): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsUtc(event.dtStamp)}`,
    `DTSTART:${formatIcsUtc(event.dtStart)}`,
    `DTEND:${formatIcsUtc(event.dtEnd)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

export function buildIcs(feed: CalendarFeed): string {
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
}
