import type { Match } from "~/types/matches";

interface PickemTournamentState {
  pickemsEnabled?: boolean;
  endAt?: Date | string | null;
  winnerId?: string | null;
  winner?: { id: string } | null;
}

function hasTournamentWinner(tournament: PickemTournamentState): boolean {
  return Boolean(tournament.winnerId || tournament.winner?.id);
}

export function isPickemTournamentActive(
  tournament: PickemTournamentState,
  now = Date.now(),
): boolean {
  if (!tournament.pickemsEnabled) return false;
  if (hasTournamentWinner(tournament)) return false;
  if (tournament.endAt && new Date(tournament.endAt).getTime() < now) return false;
  return true;
}

export function isPickemOpenForMatch(match: Match, now = Date.now()): boolean {
  if (!match.tournament?.pickemsEnabled) return false;
  if (match.endAt || match.status === "finished") return false;
  if (match.beginAt && new Date(match.beginAt).getTime() <= now) return false;
  return true;
}

export function isMatchLockedForPickem(
  match: { beginAt: Date | string | null; endAt: Date | string | null; status: string | null },
  now = Date.now(),
): boolean {
  if (match.endAt || match.status === "finished") return true;
  if (match.beginAt && new Date(match.beginAt).getTime() <= now) return true;
  return false;
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
  if (match.winnerId) {
    return pick.pickedParticipant === match.winnerId ? "correct" : "incorrect";
  }
  return pick.points === 0 ? "incorrect" : "pending";
}
