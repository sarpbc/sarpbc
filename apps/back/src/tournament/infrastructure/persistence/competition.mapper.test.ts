import { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { mikroOrmEntities } from "../../../mikro-orm.entities";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { toParticipant, toTournament } from "./competition.mapper";
import { Tournament, TournamentEvent, TournamentParticipant } from "./tournament.entities";

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

describe("toTournament", () => {
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

describe("toParticipant", () => {
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
