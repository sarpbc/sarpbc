import { describe, expect, it } from "vitest";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { mapMatchListItem } from "./match-list.mapper";
import { mapTournamentDetail, mapTournamentListItem } from "./tournament.mapper";

const event = { id: "event", name: "Fake Knockout", slug: "fake-knockout" };

const solo = (id: string, name: string, imageUrl: string | null = null) =>
  Object.assign(new TournamentParticipant(), {
    id,
    players: [
      Object.assign(new Player(), { id: `player-${id}`, imageUrl, name, slug: name.toLowerCase() }),
    ],
    team: null,
  });

const ZEN_PHOTO = "https://cdn.example/zen.png";

const knockout = () => {
  const zen = solo("zen", "Zen", ZEN_PHOTO);
  const vatira = solo("vatira", "Vatira");

  const tournament = Object.assign(new Tournament(), {
    event,
    format: "1v1",
    id: "knockout",
    name: "Fake Knockout",
    participants: [zen, vatira],
    slug: "fake-knockout",
    source: "manual",
    winner: zen,
  });

  const final = Object.assign(new Match(), {
    id: "final",
    name: "Final",
    participants: [zen, vatira],
    publicId: 9,
    results: [
      { id: "r1", match: { id: "final" }, participant: { id: "zen" }, score: 3 },
      { id: "r2", match: { id: "final" }, participant: { id: "vatira" }, score: 1 },
    ],
    status: "finished",
    tournament: Object.assign(new Tournament(), tournament, { league: null }),
    winner: zen,
  });

  tournament.matches = [final];

  return { final, tournament };
};

describe("player participants in public responses", () => {
  it("names the winner and the participants of a 1v1 tournament by their players", () => {
    const { tournament } = knockout();
    const detail = mapTournamentDetail(tournament);
    expect(detail.format).toBe("1v1");
    expect(detail.winner).toStrictEqual({
      id: "zen",
      players: [{ id: "player-zen", imageUrl: ZEN_PHOTO, name: "Zen", slug: "zen" }],
      team: null,
    });
    expect(
      detail.participants.map(({ players, team }) => ({ imageUrl: players[0]?.imageUrl, team })),
    ).toStrictEqual([
      { imageUrl: ZEN_PHOTO, team: null },
      { imageUrl: null, team: null },
    ]);
    expect(detail.matches[0]).toMatchObject({
      participants: [
        { id: "zen", players: [{ name: "Zen" }], team: null },
        { id: "vatira", players: [{ name: "Vatira" }], team: null },
      ],
      slug: "vatira-vs-zen-fake-knockout",
      winnerId: "zen",
    });
    expect(mapTournamentListItem(tournament).participants[1]).toStrictEqual({
      id: "vatira",
      players: [{ id: "player-vatira", imageUrl: null, name: "Vatira", slug: "vatira" }],
      team: null,
    });
  });

  it("lists a 1v1 match with its players and scores", () => {
    const { final } = knockout();
    expect(mapMatchListItem(final)).toMatchObject({
      participants: [
        { players: [{ imageUrl: ZEN_PHOTO, slug: "zen" }], team: null },
        { team: null },
      ],
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
      event,
      id: "cup",
      name: "Fake Cup",
      participants: [kc],
      slug: "fake-cup",
      winner: kc,
    });

    const kcTeam: unknown = expect.objectContaining({ name: "Karmine Corp" });

    expect(mapTournamentListItem(cup).format).toBe("3v3");
    expect(mapTournamentListItem(cup).participants).toStrictEqual([{ id: "kc", team: kcTeam }]);
  });
});
