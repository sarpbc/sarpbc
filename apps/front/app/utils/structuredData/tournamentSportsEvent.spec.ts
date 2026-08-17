import { describe, expect, it } from "vitest";
import type { Tournament } from "~/types/tournament";
import { SCHEMA_ORG } from "./jsonLd";
import {
  buildTournamentSportsEvent,
  eventAttendanceModeUrl,
  eventLocation,
  formatLabel,
  getTournamentChampionTeam,
  resolveStructuredDataUrl,
  sportsEventStatusUrl,
  toIsoDate,
  tournamentCanonicalUrl,
  tournamentDisplayName,
} from "./tournamentSportsEvent";

const NOW = Date.parse("2026-08-17T12:00:00.000Z");

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "rlcs-worlds",
    name: "World Championship",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("tournamentDisplayName", () => {
  it("joins league and tournament names", () => {
    expect(
      tournamentDisplayName({
        name: "Open 1",
        league: { name: "RLCS" } as Tournament["league"],
      }),
    ).toBe("RLCS Open 1");
  });

  it("falls back to the tournament name", () => {
    expect(tournamentDisplayName({ name: "Showmatch" })).toBe("Showmatch");
  });
});

describe("toIsoDate", () => {
  it("returns ISO 8601 for valid dates and omits invalid values", () => {
    expect(toIsoDate("2026-09-01T18:00:00.000Z")).toBe("2026-09-01T18:00:00.000Z");
    expect(toIsoDate("not-a-date")).toBeUndefined();
    expect(toIsoDate(undefined)).toBeUndefined();
  });
});

describe("sportsEventStatusUrl", () => {
  it("maps known statuses to EventScheduled", () => {
    expect(sportsEventStatusUrl("upcoming")).toBe(`${SCHEMA_ORG}/EventScheduled`);
    expect(sportsEventStatusUrl("live")).toBe(`${SCHEMA_ORG}/EventScheduled`);
    expect(sportsEventStatusUrl("finished")).toBe(`${SCHEMA_ORG}/EventScheduled`);
    expect(sportsEventStatusUrl(null)).toBeUndefined();
  });
});

describe("eventAttendanceModeUrl", () => {
  it("maps online, LAN, and mixed formats", () => {
    expect(eventAttendanceModeUrl("online")).toBe(`${SCHEMA_ORG}/OnlineEventAttendanceMode`);
    expect(eventAttendanceModeUrl("offline")).toBe(`${SCHEMA_ORG}/OfflineEventAttendanceMode`);
    expect(eventAttendanceModeUrl("online/offline")).toBe(`${SCHEMA_ORG}/MixedEventAttendanceMode`);
    expect(eventAttendanceModeUrl("swiss")).toBeUndefined();
    expect(eventAttendanceModeUrl(undefined)).toBeUndefined();
  });
});

describe("formatLabel", () => {
  it("uses English format labels for schema text", () => {
    expect(formatLabel("online")).toBe("Online");
    expect(formatLabel("offline")).toBe("LAN");
    expect(formatLabel("online/offline")).toBe("Online & LAN");
    expect(formatLabel("unknown")).toBeUndefined();
  });
});

describe("eventLocation", () => {
  it("uses a virtual location for online and unknown formats", () => {
    expect(eventLocation("online", "https://sarpbc.org/tournaments/1")).toEqual({
      "@type": "VirtualLocation",
      url: "https://sarpbc.org/tournaments/1",
    });
    expect(eventLocation(undefined, "https://sarpbc.org/tournaments/1")).toEqual({
      "@type": "VirtualLocation",
      url: "https://sarpbc.org/tournaments/1",
    });
  });

  it("uses a LAN place for offline events and both for mixed", () => {
    expect(eventLocation("offline", "https://sarpbc.org/tournaments/1")).toEqual({
      "@type": "Place",
      name: "LAN",
    });
    expect(eventLocation("online/offline", "https://sarpbc.org/tournaments/1")).toEqual([
      { "@type": "VirtualLocation", url: "https://sarpbc.org/tournaments/1" },
      { "@type": "Place", name: "LAN" },
    ]);
  });
});

describe("resolveStructuredDataUrl", () => {
  it("resolves absolute, protocol-relative, and relative URLs", () => {
    expect(resolveStructuredDataUrl("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(resolveStructuredDataUrl("//cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(resolveStructuredDataUrl("/img.png")).toBe("https://sarpbc.org/img.png");
    expect(resolveStructuredDataUrl("")).toBeUndefined();
  });
});

describe("getTournamentChampionTeam", () => {
  it("returns a populated winner team and ignores ids", () => {
    expect(
      getTournamentChampionTeam({
        winner: { id: "p1", team: { id: "t1", name: "Vitality", slug: "vitality", players: [] } },
      }),
    ).toMatchObject({ slug: "vitality" });
    expect(getTournamentChampionTeam({ winner: "p1" })).toBeNull();
    expect(getTournamentChampionTeam({ winner: null })).toBeNull();
  });
});

describe("buildTournamentSportsEvent", () => {
  const upcoming = tournament({
    beginAt: new Date("2026-09-01T12:00:00.000Z"),
    endAt: new Date("2026-09-07T22:00:00.000Z"),
    prizepool: "100000 United States Dollar",
    type: "offline",
    imageUrl: "https://cdn.example/worlds.png",
    league: {
      id: "rlcs",
      pandascoreId: 1,
      name: "RLCS",
      url: "https://sarpbc.org",
      imageUrl: "https://cdn.example/rlcs.png",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    participants: [
      {
        id: "p2",
        tournament: {} as Tournament,
        team: { id: "t2", name: "Vitality", slug: "vitality", players: [] },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "p1",
        tournament: {} as Tournament,
        team: { id: "t1", name: "BDS", slug: "bds", players: [] },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  });

  it("builds a SportsEvent with prize pool as award text, not an Offer", () => {
    const event = buildTournamentSportsEvent(upcoming, {
      now: NOW,
      includeCompetitors: true,
    });
    const serialized = JSON.stringify(event);

    expect(event["@type"]).toBe("SportsEvent");
    expect(event["@id"]).toBe("https://sarpbc.org/tournaments/rlcs-worlds");
    expect(event.url).toBe(tournamentCanonicalUrl("rlcs-worlds"));
    expect(event.name).toBe("RLCS World Championship");
    expect(event.sport).toBe("Rocket League");
    expect(event.startDate).toBe("2026-09-01T12:00:00.000Z");
    expect(event.endDate).toBe("2026-09-07T22:00:00.000Z");
    expect(event.eventStatus).toBe(`${SCHEMA_ORG}/EventScheduled`);
    expect(event.eventAttendanceMode).toBe(`${SCHEMA_ORG}/OfflineEventAttendanceMode`);
    expect(event.award).toBe("$100,000");
    expect(event.description).toContain("Prize pool: $100,000");
    expect(event.description).toContain("Format: LAN");
    expect(event.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "Prize pool", value: "$100,000" },
      { "@type": "PropertyValue", name: "Format", value: "LAN" },
    ]);
    expect(event.competitor?.map((team) => team.name)).toEqual(["BDS", "Vitality"]);
    expect(serialized).not.toContain('"Offer"');
    expect(serialized).not.toContain('"offers"');
    expect(serialized).not.toContain('"price"');
    expect(serialized).not.toContain('"priceCurrency"');
  });

  it("omits optional fields when data is missing", () => {
    const event = buildTournamentSportsEvent(tournament({ name: "Invite" }), { now: NOW });

    expect(event.startDate).toBeUndefined();
    expect(event.endDate).toBeUndefined();
    expect(event.eventStatus).toBeUndefined();
    expect(event.eventAttendanceMode).toBeUndefined();
    expect(event.award).toBeUndefined();
    expect(event.organizer).toBeUndefined();
    expect(event.image).toBeUndefined();
    expect(event.competitor).toBeUndefined();
    expect(event.additionalProperty).toBeUndefined();
    expect(event.location).toEqual({
      "@type": "VirtualLocation",
      url: "https://sarpbc.org/tournaments/rlcs-worlds",
    });
  });

  it("includes @context, champion, and league image on detail payloads", () => {
    const finished = tournament({
      beginAt: new Date("2026-06-01T12:00:00.000Z"),
      endAt: new Date("2026-06-08T22:00:00.000Z"),
      type: "online",
      league: {
        id: "rlcs",
        pandascoreId: 1,
        name: "RLCS",
        imageUrl: "/leagues/rlcs.png",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      winner: {
        id: "p1",
        tournament: {} as Tournament,
        team: { id: "t1", name: "Vitality", slug: "vitality", players: [] },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const event = buildTournamentSportsEvent(finished, {
      includeContext: true,
      now: NOW,
    });

    expect(event["@context"]).toBe(SCHEMA_ORG);
    expect(event.image).toBe("https://sarpbc.org/leagues/rlcs.png");
    expect(event.description).toContain("This event has finished");
    expect(event.description).toContain("Champion: Vitality");
  });
});
