import { describe, expect, it } from "vitest";
import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
  matchCalendarPath,
  matchEndAt,
  matchEventUid,
} from "./ics";
import { isMatchOnCalendar, matchToCalendarEvent } from "./matchEvent";
import type { Match } from "~/types/matches";

describe("formatIcsUtc", () => {
  it("formats UTC without separators", () => {
    expect(formatIcsUtc(new Date("2026-08-13T18:30:00.000Z"))).toBe("20260813T183000Z");
  });
});

describe("escapeIcsText", () => {
  it("escapes backslash, newline, semicolon, and comma", () => {
    expect(escapeIcsText("A; B, C\nD\\E")).toBe("A\\; B\\, C\\nD\\\\E");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines unchanged", () => {
    expect(foldIcsLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("folds at 75 octets with a leading space on continuations", () => {
    const line = `DESCRIPTION:${"a".repeat(90)}`;
    const folded = foldIcsLine(line);
    const parts = folded.split("\r\n");
    expect(parts[0]?.length).toBeLessThanOrEqual(75);
    expect(parts[1]?.startsWith(" ")).toBe(true);
  });
});

describe("matchEndAt", () => {
  const begin = new Date("2026-08-13T18:00:00.000Z");

  it("uses endAt when it is after beginAt", () => {
    const end = new Date("2026-08-13T20:15:00.000Z");
    expect(matchEndAt(begin, end, 7)).toEqual(end);
  });

  it("estimates 30 minutes per game when endAt is missing", () => {
    expect(matchEndAt(begin, undefined, 5)).toEqual(new Date("2026-08-13T20:30:00.000Z"));
  });

  it("defaults to two hours", () => {
    expect(matchEndAt(begin, undefined, undefined)).toEqual(new Date("2026-08-13T20:00:00.000Z"));
  });
});

describe("matchCalendarPath", () => {
  it("builds the public ICS path", () => {
    expect(matchCalendarPath("abc")).toBe("/calendar/match/abc.ics");
    expect(matchEventUid("abc")).toBe("match-abc@sarpbc.org");
  });
});

describe("isMatchOnCalendar", () => {
  it("keeps upcoming matches with a start time", () => {
    expect(isMatchOnCalendar({ beginAt: new Date("2026-08-14T18:00:00.000Z") })).toBe(true);
  });

  it("skips finished matches and those without beginAt", () => {
    expect(
      isMatchOnCalendar({ beginAt: new Date("2026-08-14T18:00:00.000Z"), status: "finished" }),
    ).toBe(false);
    expect(isMatchOnCalendar({})).toBe(false);
  });
});

describe("matchToCalendarEvent", () => {
  const stamp = new Date("2026-08-13T12:00:00.000Z");

  it("builds a VEVENT payload from a match", () => {
    const match = {
      id: "m1",
      name: "Vitality vs BDS",
      beginAt: new Date("2026-08-14T18:00:00.000Z"),
      numberOfGames: 7,
      createdAt: stamp,
      updatedAt: stamp,
      participants: [
        { id: "p1", team: { name: "Vitality" } },
        { id: "p2", team: { name: "BDS" } },
      ],
      tournament: { id: "t1", name: "Major", league: { id: "l1", name: "RLCS" } },
    } as Match;

    expect(matchToCalendarEvent(match, stamp)).toEqual({
      uid: "match-m1@sarpbc.org",
      summary: "Vitality vs BDS",
      description: "RLCS Major\nhttps://sarpbc.org/matches/m1",
      url: "https://sarpbc.org/matches/m1",
      dtStart: new Date("2026-08-14T18:00:00.000Z"),
      dtEnd: new Date("2026-08-14T21:30:00.000Z"),
      dtStamp: stamp,
    });
  });
});

describe("buildIcs", () => {
  it("emits a publishable calendar with CRLF and a trailing newline", () => {
    const stamp = new Date("2026-08-13T12:00:00.000Z");
    const ics = buildIcs({
      name: "RLCS Major",
      dtStamp: stamp,
      events: [
        {
          uid: "match-m1@sarpbc.org",
          summary: "Vitality vs BDS",
          description: "RLCS Major",
          url: "https://sarpbc.org/matches/m1",
          dtStart: new Date("2026-08-14T18:00:00.000Z"),
          dtEnd: new Date("2026-08-14T21:30:00.000Z"),
          dtStamp: stamp,
        },
      ],
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("PRODID:-//sarpbc.org//EN");
    expect(ics).toContain("X-WR-CALNAME:RLCS Major");
    expect(ics).toContain("UID:match-m1@sarpbc.org");
    expect(ics).toContain("SUMMARY:Vitality vs BDS");
    expect(ics).toContain("DTSTART:20260814T180000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
