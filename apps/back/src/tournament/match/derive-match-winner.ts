import type { TournamentParticipant } from "../tournament.entities";

export type ResultLike = {
  participantId: string;
  score: number;
};

export function deriveWinnerParticipantId(results: ResultLike[]): string | null {
  const scored = results.filter((r) => r.participantId);
  if (scored.length < 2) {
    return null;
  }

  let best: ResultLike | null = null;
  let tie = false;

  for (const result of scored) {
    if (!best || result.score > best.score) {
      best = result;
      tie = false;
      continue;
    }
    if (result.score === best.score) {
      tie = true;
    }
  }

  if (!best || tie) {
    return null;
  }

  return best.participantId;
}

export function findParticipantById(
  participants: TournamentParticipant[],
  participantId: string,
): TournamentParticipant | null {
  return participants.find((p) => p.id === participantId) ?? null;
}
