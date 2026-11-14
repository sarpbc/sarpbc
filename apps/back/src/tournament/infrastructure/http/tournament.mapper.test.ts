import { describe, expect, it } from "vitest";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { mapMatchListItem } from "./match-list.mapper";
import { mapTournamentDetail, mapTournamentListItem } from "./tournament.mapper";

const event = { id: "event", slug: "fake-knockout", name: "Fake Knockout" };

const solo = (id: string, name: string) =>
  Object.assign(new TournamentParticipant(), {
    id,
    team: null,
    players: [Object.assign(new Player(), { id: `player-${id}`, name, slug: name.toLowerCase() })],
  });

const knockout = () => {
  const zen = solo("zen", "Zen");
  const vatira = solo("vatira", "Vatira");

  const tournament = Object.assign(new Tournament(), {
    id: "knockout",
    source: "manual",
    format: "1v1",
    name: "Fake Knockout",
    slug: "fake-knockout",
    event,
    participants: [zen, vatira],
    winner: zen,
  });

  const final = Object.assign(new Match(), {
    id: "final",
    publicId: 9,
    name: "Final",
    status: "finished",
    tournament: Object.assign(new Tournament(), tournament, { league: null }),
    participants: [zen, vatira],
    winner: zen,
    results: [
      { id: "r1", match: { id: "final" }, participant: { id: "zen" }, score: 3 },
      { id: "r2", match: { id: "final" }, participant: { id: "vatira" }, score: 1 },
    ],
  });

  tournament.matches = [final];

  return { tournament, final };
};

describe("player participants in public responses", () => {
  it("names the winner and the participants of a 1v1 tournament by their players", () => {
    const { tournament } = knockout();
    const detail = mapTournamentDetail(tournament);
    expect(detail.format).toBe("1v1");
    expect(detail.winner).toStrictEqual({
      id: "zen",
      team: null,
      players: [{ id: "player-zen", name: "Zen", slug: "zen" }],
    });
    expect(detail.participants.map((participant) => participant.team)).toStrictEqual([null, null]);
    expect(detail.matches[0]).toMatchObject({
      slug: "vatira-vs-zen-fake-knockout",
      winnerId: "zen",
      participants: [
        { id: "zen", team: null, players: [{ name: "Zen" }] },
        { id: "vatira", team: null, players: [{ name: "Vatira" }] },
      ],
    });
    expect(mapTournamentListItem(tournament).participants[1]).toStrictEqual({
      id: "vatira",
      team: null,
      players: [{ id: "player-vatira", name: "Vatira", slug: "vatira" }],
    });
  });

  it("lists a 1v1 match with its players and scores", () => {
    const { final } = knockout();
    expect(mapMatchListItem(final)).toMatchObject({
      participants: [{ team: null, players: [{ slug: "zen" }] }, { team: null }],
      results: [
        { participant: "zen", score: 3 },
        { participant: "vatira", score: 1 },
      ],
    });
  });

  it("keeps team participants without a players list", () => {
    const kc = Object.assign(new TournamentParticipant(), {
      id: "kc",
      team: Object.assign(new Team(), {
        id: "team-kc",
        name: "Karmine Corp",
        slug: "karmine-corp",
      }),
    });

    const cup = Object.assign(new Tournament(), {
      id: "cup",
      name: "Fake Cup",
      slug: "fake-cup",
      event,
      participants: [kc],
      winner: kc,
    });

    const kcTeam: unknown = expect.objectContaining({ name: "Karmine Corp" });

    expect(mapTournamentListItem(cup).format).toBe("3v3");
    expect(mapTournamentListItem(cup).participants).toStrictEqual([{ id: "kc", team: kcTeam }]);
  });
});
