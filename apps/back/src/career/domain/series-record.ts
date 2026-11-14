import type { HeadToHead, SeriesRecord } from "@sarpbc/types";
import type { Match } from "../../tournament/domain/match";
import type { TournamentParticipant } from "../../tournament/domain/tournament-participant";

function sideOf(match: Match, playerId: string): TournamentParticipant | undefined {
  return match.participants.find(({ players }) => players.some(({ id }) => id === playerId));
}

function wonBy(match: Match, side: TournamentParticipant): boolean {
  return match.winner?.id === side.id;
}

export function seriesRecord(matches: Match[], playerId: string): SeriesRecord {
  const record: SeriesRecord = { wins: 0, losses: 0 };

  for (const match of matches) {
    const side = sideOf(match, playerId);

    if (!side || !match.isDecided()) {
      continue;
    }

    if (wonBy(match, side)) {
      record.wins += 1;
    } else {
      record.losses += 1;
    }
  }

  return record;
}

export function headToHead(matches: Match[], playerId: string, opponentId: string): HeadToHead {
  const record: HeadToHead = { a: 0, b: 0 };

  for (const match of matches) {
    const side = sideOf(match, playerId);
    const opponentSide = sideOf(match, opponentId);

    if (!side || !opponentSide || side.id === opponentSide.id || !match.isDecided()) {
      continue;
    }

    if (wonBy(match, side)) {
      record.a += 1;
    } else if (wonBy(match, opponentSide)) {
      record.b += 1;
    }
  }

  return record;
}
