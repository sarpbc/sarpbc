import { describe, expect, it } from "vitest";
import { League } from "../../domain/league";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { Team } from "../../../roster/domain/team";
import { buildHeadToHead, getWinnerTeamId, mapHeadToHeadMeeting } from "./match-head-to-head";

const createTeam = (id: string, name: string): Team => {
  const team = new Team();
  team.id = id;
  team.name = name;
  team.slug = name.toLowerCase().replaceAll(/\s+/gu, "-");

  return team;
};

const createParticipant = (id: string, team: Team): TournamentParticipant => {
  const participant = new TournamentParticipant();
  participant.id = id;
  participant.team = team;
  participant.players = [];

  return participant;
};

const createFinishedMatch = ({
  id,
  teamA,
  teamB,
  scoreA,
  scoreB,
  tournamentName = "RLCS",
  eventSlug = "rlcs-2025",
  endAt = new Date("2025-06-01T18:00:00Z"),
}: {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  tournamentName?: string;
  eventSlug?: string;
  endAt?: Date;
}): Match => {
  const tournament = new Tournament();
  tournament.id = `tournament-${id}`;
  tournament.name = tournamentName;
  tournament.slug = tournamentName.toLowerCase();
  tournament.event = { id: "event-1", name: eventSlug, slug: eventSlug };
  tournament.league = Object.assign(new League(), { id: "league-1", name: "RLCS" });

  const participantA = createParticipant(`participant-a-${id}`, teamA);
  const participantB = createParticipant(`participant-b-${id}`, teamB);

  const match = new Match();
  match.id = id;
  match.publicId = 7250;
  match.name = `${teamA.name} vs ${teamB.name}`;
  match.tournament = tournament;
  match.endAt = endAt;
  match.participants = [participantA, participantB];

  match.results = [
    { id: "a", match: { id }, participant: participantA, score: scoreA },
    { id: "b", match: { id }, participant: participantB, score: scoreB },
  ];

  if (scoreA !== scoreB) {
    match.winner = scoreA > scoreB ? participantA : participantB;
  }

  return match;
};

describe("match-head-to-head", () => {
  const teamVitality = createTeam("team-vitality", "Team Vitality");
  const teamKarmine = createTeam("team-karmine", "Karmine Corp");

  const twoMeetings = () => {
    const matches = [
      createFinishedMatch({
        endAt: new Date("2025-06-10T18:00:00Z"),
        id: "match-1",
        scoreA: 4,
        scoreB: 2,
        teamA: teamVitality,
        teamB: teamKarmine,
      }),
      createFinishedMatch({
        endAt: new Date("2025-06-01T18:00:00Z"),
        id: "match-2",
        scoreA: 3,
        scoreB: 1,
        teamA: teamKarmine,
        teamB: teamVitality,
      }),
    ];

    return buildHeadToHead(matches, teamVitality.id, teamKarmine.id);
  };

  it("counts the meetings and each team's wins", () => {
    const headToHead = twoMeetings();

    expect(headToHead.totalMeetings).toBe(2);
    expect(headToHead.teamAWins).toBe(1);
    expect(headToHead.teamBWins).toBe(1);
    expect(headToHead.recentMeetings).toHaveLength(2);
  });

  it("lists the latest meeting first with its score and winner", () => {
    const [latest] = twoMeetings().recentMeetings;

    expect(latest?.id).toBe("match-1");
    expect(latest?.scoreA).toBe(4);
    expect(latest?.scoreB).toBe(2);
    expect(latest?.winnerTeamId).toBe(teamVitality.id);
  });

  it("links each meeting to its canonical match page", () => {
    const match = createFinishedMatch({
      eventSlug: "rlcs-major-paris-2026",
      id: "match-1",
      scoreA: 4,
      scoreB: 2,
      teamA: teamVitality,
      teamB: teamKarmine,
      tournamentName: "Playoffs",
    });

    const [meeting] = buildHeadToHead([match], teamVitality.id, teamKarmine.id).recentMeetings;

    expect(meeting).toMatchObject({
      publicId: 7250,
      slug: "karmine-corp-vs-team-vitality-rlcs-major-paris-2026-playoffs",
    });
  });

  it("returns empty history when no previous meetings exist", () => {
    const headToHead = buildHeadToHead([], teamVitality.id, teamKarmine.id);

    expect(headToHead.totalMeetings).toBe(0);
    expect(headToHead.teamAWins).toBe(0);
    expect(headToHead.teamBWins).toBe(0);
    expect(headToHead.recentMeetings).toStrictEqual([]);
  });

  it("does not count ties as wins", () => {
    const match = createFinishedMatch({
      id: "match-tie",
      scoreA: 3,
      scoreB: 3,
      teamA: teamVitality,
      teamB: teamKarmine,
    });

    match.winner = null;

    const headToHead = buildHeadToHead([match], teamVitality.id, teamKarmine.id);

    expect(headToHead.totalMeetings).toBe(1);
    expect(headToHead.teamAWins).toBe(0);
    expect(headToHead.teamBWins).toBe(0);
    expect(headToHead.recentMeetings[0]?.winnerTeamId).toBeNull();
  });

  it("derives winner from scores when winner relation is missing", () => {
    const match = createFinishedMatch({
      id: "match-no-winner",
      scoreA: 4,
      scoreB: 1,
      teamA: teamVitality,
      teamB: teamKarmine,
    });

    match.winner = null;

    expect(getWinnerTeamId(match, teamVitality.id, teamKarmine.id)).toBe(teamVitality.id);
  });

  it("maps meetings regardless of participant order", () => {
    const match = createFinishedMatch({
      id: "match-order",
      scoreA: 2,
      scoreB: 4,
      teamA: teamKarmine,
      teamB: teamVitality,
    });

    const meeting = mapHeadToHeadMeeting(match, teamVitality.id, teamKarmine.id);

    expect(meeting).toStrictEqual(
      expect.objectContaining({
        scoreA: 4,
        scoreB: 2,
        teamAId: teamVitality.id,
        teamBId: teamKarmine.id,
        winnerTeamId: teamVitality.id,
      }),
    );
  });
});
