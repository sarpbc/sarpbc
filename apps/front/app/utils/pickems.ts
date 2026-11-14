import { isMatchFinished, isMatchLive, isNonEmptyDateInput, isNonEmptyString } from "@sarpbc/utils";
import type { MatchLifecycle } from "@sarpbc/utils";
import type { Match } from "~/types/matches";

interface PickemTournamentState {
  pickemsEnabled?: boolean;
  endAt?: Date | string | null;
  winnerId?: string | null;
  winner?: { id: string } | null;
}

const hasTournamentWinner = (tournament: PickemTournamentState): boolean =>
  isNonEmptyString(tournament.winnerId) || isNonEmptyString(tournament.winner?.id);

export const isPickemTournamentActive = (
  tournament: PickemTournamentState,
  now = Date.now(),
): boolean => {
  if (tournament.pickemsEnabled !== true) {
    return false;
  }

  if (hasTournamentWinner(tournament)) {
    return false;
  }

  if (isNonEmptyDateInput(tournament.endAt) && new Date(tournament.endAt).getTime() < now) {
    return false;
  }

  return true;
};

export const isMatchLockedForPickem = (match: MatchLifecycle, now = Date.now()): boolean =>
  isMatchFinished(match) || isMatchLive(match, now);

export const isPickemOpenForMatch = (match: Match, now = Date.now()): boolean =>
  Boolean(match.tournament?.pickemsEnabled) && !isMatchLockedForPickem(match, now);

export interface PickemPickState {
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
}

export const getPickOutcome = (
  match: { winnerId: string | null },
  pick: PickemPickState | undefined,
): "correct" | "incorrect" | "pending" | "none" => {
  if (!pick) {
    return "none";
  }

  if (!pick.scored) {
    return "pending";
  }

  if ((pick.points ?? 0) > 0) {
    return "correct";
  }

  if (isNonEmptyString(match.winnerId)) {
    return pick.pickedParticipant === match.winnerId ? "correct" : "incorrect";
  }

  return pick.points === 0 ? "incorrect" : "pending";
};
