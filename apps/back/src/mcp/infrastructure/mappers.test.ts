import { describe, expect, it, vi } from "vitest";
import type { DataSource, Stream, Viewership } from "@sarpbc/types";
import { Player, Team } from "../../roster/domain/roster";
import { Match, Tournament, TournamentParticipant } from "../../tournament/domain/competition";
import { TournamentEvent } from "../../tournament/domain/tournament-event";
import {
  isRedistributableMatch,
  mapEvent,
  mapListedParticipants,
  mapMatchListResponse,
  mapTournamentDetail,
  redistributableStreams,
} from "./mappers";

function match(source: DataSource, tournamentSource: DataSource, teamSource: DataSource): Match {
  return {
    source,
    tournament: { source: tournamentSource },
    participants: [{ team: { source: teamSource } }],
  } as never;
}

describe("isRedistributableMatch", () => {
  it("keeps a redistributable match with a start.gg participant team", () => {
    expect(isRedistributableMatch(match("manual", "pandascore", "startgg"))).toBe(true);
  });

  it("hides start.gg matches and matches of start.gg tournaments", () => {
    expect(isRedistributableMatch(match("startgg", "startgg", "manual"))).toBe(false);
    expect(isRedistributableMatch(match("manual", "startgg", "manual"))).toBe(false);
  });
});

describe("mapTournamentDetail participants", () => {
  function cup(source: DataSource) {
    const club = Object.assign(new Team(), {
      id: "team-kc",
      slug: "karmine-corp",
      name: "Karmine Corp",
      source: "startgg",
    });
    return Object.assign(new Tournament(), {
      id: "cup",
      name: "Coupe",
      slug: "coupe",
      source,
      imageUrl: null,
      event: { id: "event", slug: "coupe", name: "Coupe" },
      beginAt: null,
      endAt: null,
      pickemsEnabled: false,
      league: null,
      description: null,
      tier: null,
      hasBracket: false,
      winner: null,
      participants: [
        Object.assign(new TournamentParticipant(), {
          id: "part-kc",
          team: club,
          players: [Object.assign(new Player(), { id: "player-vatira", name: "Vatira" })],
        }),
      ],
      matches: [match("startgg", source, "startgg")],
    });
  }

  it("lists participant ids, team identity and roster, including a start.gg team", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const detail = mapTournamentDetail(cup("manual"));
    expect(detail.participants).toEqual([
      {
        id: "part-kc",
        name: "Karmine Corp",
        team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" },
        players: [{ id: "player-vatira", name: "Vatira", slug: "" }],
        rosterSourceUrl: null,
      },
    ]);
    expect(detail.matches).toEqual([]);
  });

  it("omits participants of a start.gg tournament", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const tournament = cup("startgg");
    expect(mapTournamentDetail(tournament)).not.toHaveProperty("participants");
    expect(mapListedParticipants(tournament.source, tournament.participants)).toEqual({});
  });
});

describe("MCP streams", () => {
  function listed(url: string, source: DataSource): Stream {
    return { url, platform: "twitch", channel: url, language: "en", kind: "official", source };
  }
  const manual = listed("https://twitch.tv/manual", "manual");
  const startgg = listed("https://twitch.tv/startgg", "startgg");

  it("drops start.gg streams from tournament and event reads", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const tournament = Object.assign(new Tournament(), {
      id: "cup",
      slug: "coupe",
      source: "manual",
      event: { id: "event", slug: "coupe", name: "Coupe" },
      streams: [startgg, manual],
    });
    expect(mapTournamentDetail(tournament).streams).toEqual([manual]);

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", streams: [startgg] });
    expect(mapEvent({ event, stages: [] }).streams).toEqual([]);
  });

  it("drops start.gg streams a match inherits from its tournament", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const inherited = Object.assign(new Match(), {
      publicId: 1,
      name: "Final",
      tournament: {
        id: "cup",
        name: "Coupe",
        slug: "coupe",
        event: { id: "event", slug: "coupe", name: "Coupe" },
        beginAt: null,
        league: null,
        pickemsEnabled: false,
        source: "manual",
        pandascoreId: null,
        streams: [startgg, manual],
        eventStreams: [],
      },
    });
    expect(mapMatchListResponse(inherited).streams).toEqual([manual]);
    expect(redistributableStreams([startgg])).toEqual([]);
  });
});

describe("MCP viewership", () => {
  const viewership: Viewership = {
    peakViewers: 12_000,
    averageViewers: null,
    scope: "official",
    measuredAt: null,
    sourceName: "Esports Charts",
    sourceUrl: "https://escharts.com/tournaments/rl/fake-cup",
  };
  function stage(source: DataSource) {
    return Object.assign(new Tournament(), {
      id: `stage-${source}`,
      slug: `stage-${source}`,
      source,
      event: { id: "event", slug: "coupe", name: "Coupe" },
    });
  }
  function played(source: DataSource) {
    return Object.assign(new Match(), {
      publicId: 1,
      name: "Final",
      source,
      viewership,
      tournament: {
        id: "cup",
        name: "Coupe",
        slug: "coupe",
        event: { id: "event", slug: "coupe", name: "Coupe" },
        beginAt: null,
        league: null,
        pickemsEnabled: false,
        source: "manual",
        pandascoreId: null,
        streams: [],
        eventStreams: [],
      },
    });
  }

  it("leaves the viewership of start.gg matches and start.gg-only events out", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    expect(mapMatchListResponse(played("manual")).viewership).toEqual(viewership);
    expect(mapMatchListResponse(played("startgg")).viewership).toBeNull();

    const event = Object.assign(new TournamentEvent(), { slug: "coupe", viewership });
    expect(mapEvent({ event, stages: [] }).viewership).toEqual(viewership);
    expect(mapEvent({ event, stages: [stage("startgg")] }).viewership).toBeNull();
    expect(mapEvent({ event, stages: [stage("startgg"), stage("manual")] }).viewership).toEqual(
      viewership,
    );
  });
});
