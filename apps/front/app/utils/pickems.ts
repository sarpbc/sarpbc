import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

export function getTournamentDisplayName(tournament: Tournament): string {
  const league = tournament.league?.name;
  const name = tournament.name;
  if (league && name) return `${league} ${name}`;
  return name ?? "";
}

function hasTournamentWinner(tournament: Tournament): boolean {
  if (tournament.winnerId) return true;
  const winner = tournament.winner;
  if (winner == null) return false;
  if (typeof winner === "string") return winner.length > 0;
  return Boolean(winner.id);
}

export function isPickemTournamentActive(tournament: Tournament, now = Date.now()): boolean {
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

export function isMatchLockedForPickem(match: Match, now = Date.now()): boolean {
  if (match.endAt || match.status === "finished") return true;
  if (match.beginAt && new Date(match.beginAt).getTime() <= now) return true;
  return false;
}

export function isMatchFinishedForPickem(match: Match): boolean {
  return Boolean(match.endAt) || match.status === "finished" || Boolean(match.winner);
}

export type PickemPickState = {
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
};

/** Open (not locked) matches that the user has not picked yet. Sorted by beginAt ascending. */
export function getUnpickedOpenMatches(
  matches: Match[],
  picks: Map<string, PickemPickState> | null | undefined,
  now = Date.now(),
): Match[] {
  return matches
    .filter((match) => match.participants?.length === 2 && match.beginAt)
    .filter((match) => !isMatchLockedForPickem(match, now))
    .filter((match) => !picks?.has(match.id))
    .sort((a, b) => new Date(a.beginAt!).getTime() - new Date(b.beginAt!).getTime());
}

export function getPickOutcome(
  match: Match,
  pick: PickemPickState | undefined,
): "correct" | "incorrect" | "pending" | "none" {
  if (!pick) return "none";
  if (!pick.scored) return "pending";
  if (pick.points != null && pick.points > 0) return "correct";
  const winnerId = match.winner?.id;
  if (winnerId) {
    return pick.pickedParticipant === winnerId ? "correct" : "incorrect";
  }
  return pick.points === 0 ? "incorrect" : "pending";
}
