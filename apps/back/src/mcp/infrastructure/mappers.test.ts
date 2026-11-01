import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "../../common/domain/data-source";
import { Team } from "../../roster/domain/roster";
import { Tournament, TournamentParticipant, type Match } from "../../tournament/domain/competition";
import { isRedistributableMatch, mapListedParticipants, mapTournamentDetail } from "./mappers";

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
        }),
      ],
      matches: [match("startgg", source, "startgg")],
    });
  }

  it("lists participant ids and team identity, including a start.gg team", () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const detail = mapTournamentDetail(cup("manual"));
    expect(detail.participants).toEqual([
      {
        id: "part-kc",
        team: { id: "team-kc", slug: "karmine-corp", name: "Karmine Corp" },
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
