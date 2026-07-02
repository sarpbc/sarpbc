import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

export function getTournamentDisplayName(tournament: Tournament): string {
  const league = tournament.league?.name;
  const name = tournament.name;
  if (league && name) return `${league} ${name}`;
  return name ?? "";
}

export function isPickemTournamentActive(tournament: Tournament, now = Date.now()): boolean {
  if (!tournament.pickemsEnabled) return false;
  if (tournament.endAt && new Date(tournament.endAt).getTime() < now) return false;
  return true;
}

export function isPickemOpenForMatch(match: Match, now = Date.now()): boolean {
  if (!match.tournament?.pickemsEnabled) return false;
  if (match.endAt || match.status === "finished") return false;
  if (match.beginAt && new Date(match.beginAt).getTime() <= now) return false;
  return true;
}
