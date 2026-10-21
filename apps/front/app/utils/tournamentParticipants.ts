import type { TeamSummary, TournamentDetail, TournamentDetailParticipant } from "@sarpbc/types";

type ParticipantPlayer = TournamentDetailParticipant["players"][number];

export interface TournamentParticipantEntry {
  team: TeamSummary;
  players: ParticipantPlayer[];
  hasReliableRoster: boolean;
}

export function hasReliableParticipantRoster(players: ParticipantPlayer[]): boolean {
  return players.some((player) => Boolean(player.slug));
}

export function buildTournamentParticipantEntries(
  tournament: Pick<TournamentDetail, "participants">,
): TournamentParticipantEntry[] {
  const seen = new Set<string>();
  const result: TournamentParticipantEntry[] = [];

  for (const participant of tournament.participants) {
    const team = participant.team;
    if (!team.slug || seen.has(team.id)) {
      continue;
    }
    seen.add(team.id);
    const players = participant.players
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
