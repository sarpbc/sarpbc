import { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { mikroOrmEntities } from "../../../mikro-orm.entities";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { toMatch, toMatchSlug, toParticipant, toTournament } from "./competition.mapper";
import { Match } from "./match.entity";
import { Tournament } from "./tournament.entity";
import { TournamentEvent } from "./tournament-event.entity";
import { TournamentParticipant } from "./tournament-participant.entity";

const orm = new MikroORM({
  entities: mikroOrmEntities,
  dbName: "competition-mapper-test",
  allowGlobalContext: true,
});

const em = orm.em.fork();

function stage() {
  const event = Object.assign(new TournamentEvent(), {
    slug: "coupe-de-france-slash-2025",
    name: "Slash",
  });

  return Object.assign(new Tournament(), { name: "Playoffs", slug: "playoffs", event });
}

function entry(tournament: Tournament, teamId: string) {
  const team = Object.assign(new Team(), { id: teamId, name: teamId });
  const participant = Object.assign(new TournamentParticipant(), { tournament, team });
  tournament.participants.add(participant);

  return participant;
}

describe(toTournament, () => {
  it("maps a won stage with its winner and participants", () => {
    const tournament = stage();
    const winner = entry(tournament, "gentle-mates");
    entry(tournament, "next2nu");
    tournament.winner = winner;

    const mapped = toTournament(tournament);

    expect(mapped.winner?.team?.id).toBe("gentle-mates");
    expect(mapped.participants.map((p) => p.team?.id)).toEqual(["gentle-mates", "next2nu"]);
  });

  it("maps a stage whose winner was loaded without its relations", () => {
    const tournament = stage();
    tournament.winner = em.getReference(TournamentParticipant, "unloaded-winner");

    const mapped = toTournament(tournament);

    expect(mapped.id).toBe(tournament.id);
    expect(mapped.winner).toBeNull();
  });

  it("skips a participant whose team was not loaded", () => {
    const tournament = stage();
    entry(tournament, "gentle-mates");

    const orphan = Object.assign(new TournamentParticipant(), {
      tournament,
      team: em.getReference(Team, "unloaded-team"),
    });

    tournament.participants.add(orphan);

    expect(toTournament(tournament).participants.map((p) => p.team?.id)).toEqual(["gentle-mates"]);
  });
});

describe(toParticipant, () => {
  it("returns null when the tournament relation is missing", () => {
    const participant = entry(stage(), "gentle-mates");
    Object.assign(participant, { tournament: undefined });

    expect(toParticipant(participant)).toBeNull();
  });

  it("drops players that were not loaded", () => {
    const participant = entry(stage(), "gentle-mates");
    participant.players.add(
      Object.assign(new Player(), { id: "m0nkey-m00n", name: "M0nkey M00n" }),
    );
    participant.players.add(em.getReference(Player, "unloaded-player"));

    expect(toParticipant(participant)?.players.map((p) => p.id)).toEqual(["m0nkey-m00n"]);
  });
});

function renamedStage(beginAt: string) {
  const tournament = Object.assign(stage(), { beginAt: new Date(beginAt) });
  const participant = entry(tournament, "fixture");
  Object.assign(participant.team ?? {}, {
    name: "Fixture Now",
    aliases: [
      {
        id: "a1",
        name: "Fixture Origins",
        from: "2020-01-01",
        to: "2022-06-01",
        sourceUrl: "https://x.com/fixture/status/1",
        logoUrl: null,
        pandascoreId: null,
      },
    ],
  });

  return { tournament, participant };
}

describe("names in force on the date", () => {
  it("shows the stage participants under the name they used when the stage began", () => {
    const { tournament } = renamedStage("2021-05-01T18:00:00Z");

    const team = toTournament(tournament).participants[0]?.team;

    expect(team).toMatchObject({ id: "fixture", name: "Fixture Origins" });
  });

  it("names a match side after the match date and keeps the slug on the same name", () => {
    const { tournament, participant } = renamedStage("2022-05-30T18:00:00Z");

    const match = Object.assign(new Match(), {
      name: "Final",
      tournament,
      beginAt: new Date("2022-06-02T18:00:00Z"),
    });

    match.participants.add(participant);
    match.participants.add(entry(tournament, "opponent"));

    expect(toMatch(match).participants[0]?.team?.name).toBe("Fixture Now");
    expect(toTournament(tournament).participants[0]?.team?.name).toBe("Fixture Origins");
    expect(toMatchSlug(match)).toMatch(/^fixture-now-vs-opponent-/);
  });
});
