import type { TeamSummary, TournamentDetail, TournamentDetailParticipant } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";

type ParticipantPlayer = TournamentDetailParticipant["players"][number];

export interface TournamentParticipantEntry {
  id: string;
  name: string;
  team: TeamSummary | null;
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
    const { team } = participant;
    const key = team?.id ?? participant.id;
    const listed = team ? Boolean(team.slug) : participant.players.length > 0;

    if (!listed || seen.has(key)) {
      continue;
    }

    seen.add(key);

    const players = participant.players
      .filter((player) => player.slug)
      .sort((a, b) => a.name.localeCompare(b.name));

    result.push({
      id: key,
      name: participantName(participant),
      team,
      players,
      hasReliableRoster: hasReliableParticipantRoster(participant.players),
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
