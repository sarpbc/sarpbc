import type { TournamentFormat } from "@sarpbc/types";

export const TEAM_SIZE_BY_FORMAT: Record<TournamentFormat, number> = {
  "1v1": 1,
  "2v2": 2,
  "3v3": 3,
};

export interface NamedParticipant {
  team: { name: string } | null;
  players?: readonly { name: string }[];
}

export function participantName(participant: NamedParticipant): string {
  return participant.team?.name ?? (participant.players ?? []).map(({ name }) => name).join(" / ");
}
