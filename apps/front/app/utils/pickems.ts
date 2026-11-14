import {
  isMatchFinished,
  isMatchLive,
  isNonEmptyDateInput,
  isNonEmptyString,
  type MatchLifecycle,
} from "@sarpbc/utils";
import type { Match } from "~/types/matches";

interface PickemTournamentState {
  pickemsEnabled?: boolean;
  endAt?: Date | string | null;
  winnerId?: string | null;
  winner?: { id: string } | null;
}

function hasTournamentWinner(tournament: PickemTournamentState): boolean {
  return isNonEmptyString(tournament.winnerId) || isNonEmptyString(tournament.winner?.id);
}

export function isPickemTournamentActive(
  tournament: PickemTournamentState,
  now = Date.now(),
): boolean {
  if (tournament.pickemsEnabled !== true) return false;

  if (hasTournamentWinner(tournament)) return false;

  if (isNonEmptyDateInput(tournament.endAt) && new Date(tournament.endAt).getTime() < now)
    return false;

  return true;
}

export function isPickemOpenForMatch(match: Match, now = Date.now()): boolean {
  return Boolean(match.tournament?.pickemsEnabled) && !isMatchLockedForPickem(match, now);
}

export function isMatchLockedForPickem(match: MatchLifecycle, now = Date.now()): boolean {
  return isMatchFinished(match) || isMatchLive(match, now);
}

export type PickemPickState = {
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
};

export function getPickOutcome(
  match: { winnerId: string | null },
  pick: PickemPickState | undefined,
): "correct" | "incorrect" | "pending" | "none" {
  if (!pick) return "none";

  if (!pick.scored) return "pending";

  if (pick.points != null && pick.points > 0) return "correct";

  if (isNonEmptyString(match.winnerId)) {
    return pick.pickedParticipant === match.winnerId ? "correct" : "incorrect";
  }

  return pick.points === 0 ? "incorrect" : "pending";
}
