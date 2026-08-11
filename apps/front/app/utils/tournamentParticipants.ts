import type { Player } from "~/types/player";
import type { Team } from "~/types/team";
import type { Tournament, TournamentParticipant } from "~/types/tournament";

export interface TournamentParticipantEntry {
  team: Team;
  players: Player[];
  hasReliableRoster: boolean;
}

export function hasReliableParticipantRoster(players?: Player[]): boolean {
  return (players ?? []).some((player) => Boolean(player.slug));
}

function getParticipantTeam(participant: TournamentParticipant): Team | null {
  return participant.team ?? null;
}

export function buildTournamentParticipantEntries(
  tournament: Pick<Tournament, "participants">,
): TournamentParticipantEntry[] {
  const participants = tournament.participants ?? [];
  const seen = new Set<string>();
  const result: TournamentParticipantEntry[] = [];

  for (const participant of participants) {
    const team = getParticipantTeam(participant);
    if (!team?.slug || seen.has(team.id)) {
      continue;
    }
    seen.add(team.id);
    const players = (participant.players ?? [])
      .filter((player) => player.slug)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push({
      team,
      players,
      hasReliableRoster: hasReliableParticipantRoster(participant.players),
    });
  }

  return result.sort((a, b) => a.team.name.localeCompare(b.team.name));
}
