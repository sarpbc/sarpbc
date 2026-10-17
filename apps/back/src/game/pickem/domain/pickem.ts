import { InvalidInputError } from "../../../common/domain/errors";
export interface PickMatch {
  id: string;
  pickemsEnabled: boolean;
  beginAt: Date | null;
  endAt: Date | null;
  status: string | null;
  participantIds: string[];
  winnerId: string | null;
  results: { participantId: string; score: number }[];
}
export interface Pick {
  id: string;
  user: { id: string; userName: string };
  match: { id: string };
  pickedParticipant: { id: string };
  points: number | null;
  scored: boolean;
  createdAt: Date;
}
export function assertPickAllowed(
  match: PickMatch,
  participantId: string,
  now: Date,
  scored: boolean,
): void {
  if (!match.pickemsEnabled)
    throw new InvalidInputError(
      "Pick'ems are not enabled for this tournament. Choose another tournament.",
    );
  if (match.beginAt && match.beginAt <= now)
    throw new InvalidInputError(
      "This match has already started. Picks are locked for this series.",
    );
  if (match.endAt || match.status === "finished")
    throw new InvalidInputError("This match is finished. Picks are locked.");
  if (!match.participantIds.includes(participantId))
    throw new InvalidInputError(
      "That team is not part of this match. Refresh the page and try again.",
    );
  if (scored)
    throw new InvalidInputError("This pick has already been scored and cannot be changed.");
}
export function derivePickWinner(match: PickMatch): string | null {
  if (match.winnerId) return match.winnerId;
  if (match.results.length < 2) return null;
  const sorted = [...match.results].sort((a, b) => b.score - a.score);
  const first = sorted[0],
    second = sorted[1];
  return first &&
    second &&
    first.score > second.score &&
    match.participantIds.includes(first.participantId)
    ? first.participantId
    : null;
}
export function scorePick(pick: Pick, winnerId: string): void {
  if (pick.scored) return;
  pick.points = pick.pickedParticipant.id === winnerId ? 5 : 0;
  pick.scored = true;
}
