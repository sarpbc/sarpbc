import { Collection } from "@mikro-orm/core";
import { Match } from "./match.entity";
import { Tournament } from "../domain/tournament.entity";
import { TournamentParticipant } from "../domain/tournament-participant.entity";
import { Team } from "../../team/domain/team.entity";
import { MatchResult } from "./match-result.entity";
import { buildHeadToHead, getWinnerTeamId, mapHeadToHeadMeeting } from "./match-head-to-head";

function createTeam(id: string, name: string): Team {
  const team = new Team();
  team.id = id;
  team.name = name;
  team.slug = name.toLowerCase().replace(/\s+/g, "-");
  return team;
}

function createParticipant(id: string, team: Team): TournamentParticipant {
  const participant = new TournamentParticipant();
  participant.id = id;
  participant.team = team;
  participant.players = new Collection(participant);
  return participant;
}

function createFinishedMatch({
  id,
  teamA,
  teamB,
  scoreA,
  scoreB,
  tournamentName = "RLCS",
  leagueName = "RLCS",
  endAt = new Date("2025-06-01T18:00:00Z"),
}: {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  tournamentName?: string;
  leagueName?: string;
  endAt?: Date;
}): Match {
  const tournament = new Tournament();
  tournament.id = `tournament-${id}`;
  tournament.name = tournamentName;
  tournament.league = { id: "league-1", name: leagueName } as Tournament["league"];

  const participantA = createParticipant(`participant-a-${id}`, teamA);
  const participantB = createParticipant(`participant-b-${id}`, teamB);

  const match = new Match();
  match.id = id;
  match.name = `${teamA.name} vs ${teamB.name}`;
  match.tournament = tournament;
  match.endAt = endAt;
  match.participants = new Collection(match, [participantA, participantB]);

  const resultA = new MatchResult();
  resultA.participant = participantA;
  resultA.score = scoreA;

  const resultB = new MatchResult();
  resultB.participant = participantB;
  resultB.score = scoreB;

  match.results = new Collection(match, [resultA, resultB]);

  if (scoreA !== scoreB) {
    match.winner = scoreA > scoreB ? participantA : participantB;
  }

  return match;
}

describe("match-head-to-head", () => {
  const teamVitality = createTeam("team-vitality", "Team Vitality");
  const teamKarmine = createTeam("team-karmine", "Karmine Corp");

  it("builds aggregate record and recent meetings", () => {
    const matches = [
      createFinishedMatch({
        id: "match-1",
        teamA: teamVitality,
        teamB: teamKarmine,
        scoreA: 4,
        scoreB: 2,
        endAt: new Date("2025-06-10T18:00:00Z"),
      }),
      createFinishedMatch({
        id: "match-2",
        teamA: teamKarmine,
        teamB: teamVitality,
        scoreA: 3,
        scoreB: 1,
        endAt: new Date("2025-06-01T18:00:00Z"),
      }),
    ];

    const headToHead = buildHeadToHead(matches, teamVitality.id, teamKarmine.id);

    expect(headToHead.totalMeetings).toBe(2);
    expect(headToHead.teamAWins).toBe(1);
    expect(headToHead.teamBWins).toBe(1);
    expect(headToHead.recentMeetings).toHaveLength(2);
    expect(headToHead.recentMeetings[0]?.id).toBe("match-1");
    expect(headToHead.recentMeetings[0]?.scoreA).toBe(4);
    expect(headToHead.recentMeetings[0]?.scoreB).toBe(2);
    expect(headToHead.recentMeetings[0]?.winnerTeamId).toBe(teamVitality.id);
  });

  it("returns empty history when no previous meetings exist", () => {
    const headToHead = buildHeadToHead([], teamVitality.id, teamKarmine.id);

    expect(headToHead.totalMeetings).toBe(0);
    expect(headToHead.teamAWins).toBe(0);
    expect(headToHead.teamBWins).toBe(0);
    expect(headToHead.recentMeetings).toEqual([]);
  });

  it("does not count ties as wins", () => {
    const match = createFinishedMatch({
      id: "match-tie",
      teamA: teamVitality,
      teamB: teamKarmine,
      scoreA: 3,
      scoreB: 3,
    });
    match.winner = undefined;

    const headToHead = buildHeadToHead([match], teamVitality.id, teamKarmine.id);

    expect(headToHead.totalMeetings).toBe(1);
    expect(headToHead.teamAWins).toBe(0);
    expect(headToHead.teamBWins).toBe(0);
    expect(headToHead.recentMeetings[0]?.winnerTeamId).toBeNull();
  });

  it("derives winner from scores when winner relation is missing", () => {
    const match = createFinishedMatch({
      id: "match-no-winner",
      teamA: teamVitality,
      teamB: teamKarmine,
      scoreA: 4,
      scoreB: 1,
    });
    match.winner = undefined;

    expect(getWinnerTeamId(match, teamVitality.id, teamKarmine.id)).toBe(teamVitality.id);
  });

  it("maps meetings regardless of participant order", () => {
    const match = createFinishedMatch({
      id: "match-order",
      teamA: teamKarmine,
      teamB: teamVitality,
      scoreA: 2,
      scoreB: 4,
    });

    const meeting = mapHeadToHeadMeeting(match, teamVitality.id, teamKarmine.id);

    expect(meeting).toEqual(
      expect.objectContaining({
        teamAId: teamVitality.id,
        teamBId: teamKarmine.id,
        scoreA: 4,
        scoreB: 2,
        winnerTeamId: teamVitality.id,
      }),
    );
  });
});
