import type { Tournament } from "~/types/tournament";

export function tournamentLabel(tournament: Pick<Tournament, "name" | "event">): string {
  const eventName = tournament.event.name.trim();
  const stageName = tournament.name.trim();
  // Single-stage events are named after their stage, sometimes behind the league name.
  if (!stageName || eventName.toLowerCase().endsWith(stageName.toLowerCase())) {
    return eventName;
  }
  return `${eventName} ${stageName}`;
}
