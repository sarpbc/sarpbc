import type { HeadToHead, SeriesRecord } from "@sarpbc/types";
import type { Match } from "../../tournament/domain/match";
import type { TournamentParticipant } from "../../tournament/domain/tournament-participant";

const sideOf = (match: Match, playerId: string) =>
  match.participants.find(({ players }) => players.some(({ id }) => id === playerId));

const wonBy = (match: Match, side: TournamentParticipant) => match.winner?.id === side.id;

export const seriesRecord = (matches: Match[], playerId: string) => {
  const record: SeriesRecord = { losses: 0, wins: 0 };

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

  return record satisfies SeriesRecord;
};

export const headToHead = (matches: Match[], playerId: string, opponentId: string) => {
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

  return record satisfies HeadToHead;
};
