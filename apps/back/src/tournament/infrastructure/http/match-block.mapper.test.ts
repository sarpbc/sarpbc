import { describe, expect, it } from "vitest";
import { Team } from "../../../roster/domain/roster";
import { Match, TournamentParticipant, type TournamentSummary } from "../../domain/competition";
import { mapMatchBlockItem } from "./match-list.mapper";

const NOW = new Date("2026-10-31T18:00:00Z");

function participant(name: string): TournamentParticipant {
  return Object.assign(new TournamentParticipant(), {
    id: `participant-${name}`,
    team: Object.assign(new Team(), { id: `team-${name}`, name, slug: name.toLowerCase() }),
  });
}

function tournament(source: TournamentSummary["source"]): TournamentSummary {
  return {
    id: "tournament",
    name: "Playoffs",
    slug: "playoffs",
    event: { id: "event", slug: "rlcs-worlds-2026", name: "RLCS Worlds 2026" },
    beginAt: null,
    league: null,
    pickemsEnabled: false,
    source,
    pandascoreId: null,
  };
}

function match(overrides: Partial<Match>): Match {
  return Object.assign(new Match(), {
    id: "match",
    publicId: 42,
    name: "Grand final",
    source: "pandascore",
    participants: [participant("Karmine Corp"), participant("Team Falcons")],
    tournament: tournament("pandascore"),
    ...overrides,
  });
}

describe("mapMatchBlockItem", () => {
  it("derives the state the public lists use", () => {
    const upcoming = match({ beginAt: new Date("2026-10-31T20:00:00Z") });
    const live = match({ beginAt: new Date("2026-10-31T17:00:00Z") });
    const ended = match({
      beginAt: new Date("2026-10-31T15:00:00Z"),
      endAt: new Date("2026-10-31T16:30:00Z"),
    });
    const finishedStatus = match({ beginAt: live.beginAt, status: "finished" });

    expect(mapMatchBlockItem(upcoming, NOW, 0).state).toBe("upcoming");
    expect(mapMatchBlockItem(match({}), NOW, 0).state).toBe("upcoming");
    expect(mapMatchBlockItem(live, NOW, 0).state).toBe("live");
    expect(mapMatchBlockItem(ended, NOW, 0).state).toBe("finished");
    expect(mapMatchBlockItem(finishedStatus, NOW, 0).state).toBe("finished");
  });

  it("does not keep a match without an end live for hours", () => {
    const stale = match({ beginAt: new Date("2026-10-30T18:00:00Z") });
    expect(mapMatchBlockItem(stale, NOW, 0).state).toBe("finished");
  });

  it("flags start.gg matches and matches of start.gg tournaments for credit", () => {
    expect(mapMatchBlockItem(match({}), NOW, 0).startgg).toBe(false);
    expect(mapMatchBlockItem(match({ source: "startgg" }), NOW, 0).startgg).toBe(true);
    expect(
      mapMatchBlockItem(match({ source: "manual", tournament: tournament("startgg") }), NOW, 0)
        .startgg,
    ).toBe(true);
  });

  it("keeps the list item fields and the comment count", () => {
    expect(mapMatchBlockItem(match({}), NOW, 3)).toMatchObject({
      id: "match",
      publicId: 42,
      slug: "karmine-corp-vs-team-falcons-rlcs-worlds-2026-playoffs",
      commentCount: 3,
      participants: [
        { id: "participant-Karmine Corp", team: { name: "Karmine Corp" } },
        { id: "participant-Team Falcons", team: { name: "Team Falcons" } },
      ],
      tournament: { id: "tournament", slug: "playoffs" },
    });
  });
});
