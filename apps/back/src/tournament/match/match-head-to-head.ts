import type { Match } from "./match.entity";

export interface HeadToHeadMeeting {
  id: string;
  beginAt?: Date;
  endAt?: Date;
  tournamentLabel: string;
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
}

export interface HeadToHead {
  teamAId: string;
  teamBId: string;
  teamAWins: number;
  teamBWins: number;
  totalMeetings: number;
  recentMeetings: HeadToHeadMeeting[];
}

export function formatTournamentLabel(match: Match): string {
  const league = match.tournament?.league?.name;
  const name = match.tournament?.name;
  if (league && name) {
    return `${league} ${name}`;
  }
  return name ?? "Unknown tournament";
}

export function getWinnerTeamId(match: Match, teamAId: string, teamBId: string): string | null {
  if (match.winner?.team?.id) {
    const winnerId = match.winner.team.id;
    if (winnerId === teamAId || winnerId === teamBId) {
      return winnerId;
    }
  }

  const participants = match.participants.getItems();
  const teamAParticipant = participants.find((p) => p.team.id === teamAId);
  const teamBParticipant = participants.find((p) => p.team.id === teamBId);

  if (!teamAParticipant || !teamBParticipant) {
    return null;
  }

  const results = match.results.getItems();
  const scoreA = results.find((r) => r.participant.id === teamAParticipant.id)?.score;
  const scoreB = results.find((r) => r.participant.id === teamBParticipant.id)?.score;

  if (scoreA === undefined || scoreB === undefined || scoreA === scoreB) {
    return null;
  }

  return scoreA > scoreB ? teamAId : teamBId;
}

export function mapHeadToHeadMeeting(
  match: Match,
  teamAId: string,
  teamBId: string,
): HeadToHeadMeeting | null {
  const participants = match.participants.getItems();
  const teamAParticipant = participants.find((p) => p.team.id === teamAId);
  const teamBParticipant = participants.find((p) => p.team.id === teamBId);

  if (!teamAParticipant || !teamBParticipant) {
    return null;
  }

  const results = match.results.getItems();
  const scoreA = results.find((r) => r.participant.id === teamAParticipant.id)?.score ?? null;
  const scoreB = results.find((r) => r.participant.id === teamBParticipant.id)?.score ?? null;

  return {
    id: match.id,
    beginAt: match.beginAt,
    endAt: match.endAt,
    tournamentLabel: formatTournamentLabel(match),
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    winnerTeamId: getWinnerTeamId(match, teamAId, teamBId),
  };
}

export function buildHeadToHead(
  matches: Match[],
  teamAId: string,
  teamBId: string,
  recentLimit = 5,
): HeadToHead {
  const meetings = matches
    .map((match) => mapHeadToHeadMeeting(match, teamAId, teamBId))
    .filter((meeting): meeting is HeadToHeadMeeting => meeting !== null);

  let teamAWins = 0;
  let teamBWins = 0;

  for (const meeting of meetings) {
    if (meeting.winnerTeamId === teamAId) {
      teamAWins += 1;
    } else if (meeting.winnerTeamId === teamBId) {
      teamBWins += 1;
    }
  }

  return {
    teamAId,
    teamBId,
    teamAWins,
    teamBWins,
    totalMeetings: meetings.length,
    recentMeetings: meetings.slice(0, recentLimit),
  };
}
