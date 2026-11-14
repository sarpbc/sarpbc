import { describe, expect, it } from "vitest";
import { Team } from "../../../roster/domain/team";
import { League } from "../../domain/league";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { mapMatchListItem } from "./match-list.mapper";
import { mapTournamentDetail } from "./tournament.mapper";

const participant = (name: string): TournamentParticipant =>
  Object.assign(new TournamentParticipant(), {
    id: `participant-${name}`,
    team: Object.assign(new Team(), { id: `team-${name}`, name, slug: name.toLowerCase() }),
  });

const tournament = (): Tournament =>
  Object.assign(new Tournament(), {
    id: "tournament",
    name: "Playoffs",
    slug: "playoffs",
    event: { id: "event", slug: "rlcs-major-paris-2026", name: "RLCS Major Paris 2026" },
    beginAt: new Date("2026-03-01T00:00:00Z"),
    league: Object.assign(new League(), { id: "league", name: "RLCS Major" }),
  });

const match = (overrides: Partial<Match>): Match =>
  Object.assign(new Match(), {
    id: "match",
    publicId: 7250,
    name: "Upper bracket final: Karmine Corp vs Team Falcons",
    slug: "stored-pandascore-slug",
    ...overrides,
  });

describe("match links in API payloads", () => {
  it("adds the public id and computed slug to match list items", () => {
    const item = mapMatchListItem(
      match({
        participants: [participant("Karmine Corp"), participant("Team Falcons")],
        tournament: tournament(),
      }),
    );

    expect(item).toMatchObject({
      publicId: 7250,
      slug: "karmine-corp-vs-team-falcons-rlcs-major-paris-2026-playoffs",
      tournament: {
        slug: "playoffs",
        event: { id: "event", slug: "rlcs-major-paris-2026", name: "RLCS Major Paris 2026" },
        league: { id: "league", name: "RLCS Major" },
      },
    });
  });

  it("falls back to the round label while a team is still unknown", () => {
    const item = mapMatchListItem(
      match({
        name: "Lower bracket round 2: TBD vs Team Falcons",
        participants: [participant("Team Falcons")],
        tournament: tournament(),
      }),
    );

    expect(item.slug).toBe("lower-bracket-round-2-rlcs-major-paris-2026-playoffs");
  });

  it("describes tournament matches from their parent tournament", () => {
    const parent = tournament();
    parent.matches = [
      match({
        participants: [participant("Karmine Corp"), participant("Team Falcons")],
        tournament: Object.assign(new Tournament(), parent, { league: null }),
      }),
    ];

    const [mapped] = mapTournamentDetail(parent).matches;

    expect(mapped).toMatchObject({
      publicId: 7250,
      slug: "karmine-corp-vs-team-falcons-rlcs-major-paris-2026-playoffs",
    });
  });
});
