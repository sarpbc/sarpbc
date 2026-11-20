import { describe, expect, it, vi } from "vitest";
import type { Stream, Viewership } from "@sarpbc/types";
import { Player } from "../../roster/domain/player";
import { Team } from "../../roster/domain/team";
import { Match } from "../../tournament/domain/match";
import { Tournament } from "../../tournament/domain/tournament";
import { TournamentParticipant } from "../../tournament/domain/tournament-participant";
import { TournamentEvent } from "../../tournament/domain/tournament-event";
import { mapEvent, mapMatchListResponse, mapTournamentDetail } from "./mappers";

const cup = () => {
  const club = Object.assign(new Team(), {
    id: "team-kc",
    name: "Karmine Corp",
    slug: "karmine-corp",
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
    matches: [],
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
    source: "manual",
    tier: null,
    winner: null,
  });
};

describe("mapTournamentDetail participants", () => {
  it("lists participant ids, team identity and roster", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const detail = mapTournamentDetail(cup());
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
});

const manual = {
  channel: "manual",
  kind: "official",
  language: "en",
  platform: "twitch",
  source: "manual",
  url: "https://twitch.tv/manual",
} satisfies Stream;

const matchTournament = {
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
  streams: [manual],
};

describe("MCP streams", () => {
  it("returns tournament and event streams", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const tournament = Object.assign(new Tournament(), {
      event: { id: "event", name: "Coupe", slug: "coupe" },
      id: "cup",
      slug: "coupe",
      source: "manual",
      streams: [manual],
    });

    expect(mapTournamentDetail(tournament).streams).toStrictEqual([manual]);

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", streams: [manual] });
    expect(mapEvent({ event, stages: [] }).streams).toStrictEqual([manual]);
  });

  it("returns the streams a match inherits from its tournament", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const inherited = Object.assign(new Match(), {
      name: "Final",
      publicId: 1,
      tournament: matchTournament,
    });

    expect(mapMatchListResponse(inherited).streams).toStrictEqual([manual]);
  });
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

  it("returns the viewership of matches and events", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const played = Object.assign(new Match(), {
      name: "Final",
      publicId: 1,
      source: "manual",
      tournament: { ...matchTournament, streams: [] },
      viewership,
    });

    expect(mapMatchListResponse(played).viewership).toStrictEqual(viewership);

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", viewership });
    expect(mapEvent({ event, stages: [] }).viewership).toStrictEqual(viewership);
  });
});
