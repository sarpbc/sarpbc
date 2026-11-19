import { describe, expect, it, vi } from "vitest";
import type { DataSource, Stream, Viewership } from "@sarpbc/types";
import { Player } from "../../roster/domain/player";
import { Team } from "../../roster/domain/team";
import { Match } from "../../tournament/domain/match";
import { Tournament } from "../../tournament/domain/tournament";
import { TournamentParticipant } from "../../tournament/domain/tournament-participant";
import { TournamentEvent } from "../../tournament/domain/tournament-event";
import {
  isRedistributableMatch,
  mapEvent,
  mapListedParticipants,
  mapMatchListResponse,
  mapTournamentDetail,
  redistributableStreams,
} from "./mappers";

const match = (source: DataSource, tournamentSource: DataSource, teamSource: DataSource) =>
  Object.assign(new Match(), {
    participants: [{ team: { source: teamSource } }],
    source,
    tournament: { source: tournamentSource },
  });

describe(isRedistributableMatch, () => {
  it("keeps a redistributable match with a start.gg participant team", () => {
    expect(isRedistributableMatch(match("manual", "pandascore", "startgg"))).toBe(true);
  });

  it("hides start.gg matches and matches of start.gg tournaments", () => {
    expect(isRedistributableMatch(match("startgg", "startgg", "manual"))).toBe(false);
    expect(isRedistributableMatch(match("manual", "startgg", "manual"))).toBe(false);
  });
});

const cup = (source: DataSource) => {
  const club = Object.assign(new Team(), {
    id: "team-kc",
    name: "Karmine Corp",
    slug: "karmine-corp",
    source: "startgg",
  });

  return Object.assign(new Tournament(), {
    beginAt: null,
    description: null,
    endAt: null,
    event: { id: "event", name: "Coupe", slug: "coupe" },
    hasBracket: false,
    id: "cup",
    imageUrl: null,
    league: null,
    matches: [match("startgg", source, "startgg")],
    name: "Coupe",
    participants: [
      Object.assign(new TournamentParticipant(), {
        id: "part-kc",
        players: [Object.assign(new Player(), { id: "player-vatira", name: "Vatira" })],
        team: club,
      }),
    ],
    pickemsEnabled: false,
    slug: "coupe",
    source,
    tier: null,
    winner: null,
  });
};

describe("mapTournamentDetail participants", () => {
  it("lists participant ids, team identity and roster, including a start.gg team", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const detail = mapTournamentDetail(cup("manual"));
    expect(detail.participants).toStrictEqual([
      {
        id: "part-kc",
        name: "Karmine Corp",
        players: [{ id: "player-vatira", name: "Vatira", slug: "" }],
        rosterSourceUrl: null,
        team: { id: "team-kc", name: "Karmine Corp", slug: "karmine-corp" },
      },
    ]);
    expect(detail.matches).toStrictEqual([]);
  });

  it("omits participants of a start.gg tournament", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const tournament = cup("startgg");
    expect(mapTournamentDetail(tournament)).not.toHaveProperty("participants");
    expect(mapListedParticipants(tournament.source, tournament.participants)).toStrictEqual({});
  });
});

const listed = (url: string, source: DataSource) =>
  ({
    channel: url,
    kind: "official",
    language: "en",
    platform: "twitch",
    source,
    url,
  }) satisfies Stream;

describe("MCP streams", () => {
  const manual = listed("https://twitch.tv/manual", "manual");
  const startgg = listed("https://twitch.tv/startgg", "startgg");

  it("drops start.gg streams from tournament and event reads", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const tournament = Object.assign(new Tournament(), {
      event: { id: "event", name: "Coupe", slug: "coupe" },
      id: "cup",
      slug: "coupe",
      source: "manual",
      streams: [startgg, manual],
    });

    expect(mapTournamentDetail(tournament).streams).toStrictEqual([manual]);

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", streams: [startgg] });
    expect(mapEvent({ event, stages: [] }).streams).toStrictEqual([]);
  });

  it("drops start.gg streams a match inherits from its tournament", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const inherited = Object.assign(new Match(), {
      name: "Final",
      publicId: 1,
      tournament: {
        beginAt: null,
        event: { id: "event", name: "Coupe", slug: "coupe" },
        eventStreams: [],
        id: "cup",
        league: null,
        name: "Coupe",
        pandascoreId: null,
        pickemsEnabled: false,
        slug: "coupe",
        source: "manual",
        streams: [startgg, manual],
      },
    });

    expect(mapMatchListResponse(inherited).streams).toStrictEqual([manual]);
    expect(redistributableStreams([startgg])).toStrictEqual([]);
  });
});

const stage = (source: DataSource) =>
  Object.assign(new Tournament(), {
    event: { id: "event", name: "Coupe", slug: "coupe" },
    id: `stage-${source}`,
    slug: `stage-${source}`,
    source,
  });

describe("MCP viewership", () => {
  const viewership: Viewership = {
    averageViewers: null,
    measuredAt: null,
    peakViewers: 12_000,
    scope: "official",
    sourceName: "Esports Charts",
    sourceUrl: "https://escharts.com/tournaments/rl/fake-cup",
  };

  const played = (source: DataSource) =>
    Object.assign(new Match(), {
      name: "Final",
      publicId: 1,
      source,
      tournament: {
        beginAt: null,
        event: { id: "event", name: "Coupe", slug: "coupe" },
        eventStreams: [],
        id: "cup",
        league: null,
        name: "Coupe",
        pandascoreId: null,
        pickemsEnabled: false,
        slug: "coupe",
        source: "manual",
        streams: [],
      },
      viewership,
    });

  it("leaves the viewership of start.gg matches and start.gg-only events out", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    expect(mapMatchListResponse(played("manual")).viewership).toStrictEqual(viewership);
    expect(mapMatchListResponse(played("startgg")).viewership).toBeNull();

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", viewership });
    expect(mapEvent({ event, stages: [] }).viewership).toStrictEqual(viewership);
    expect(mapEvent({ event, stages: [stage("startgg")] }).viewership).toBeNull();
    expect(
      mapEvent({ event, stages: [stage("startgg"), stage("manual")] }).viewership,
    ).toStrictEqual(viewership);
  });
});
