import type { TournamentFormat } from "@sarpbc/types";
import type { ThemedLogo } from "./themed-logo";

export const TEAM_SIZE_BY_FORMAT = {
  "1v1": 1,
  "2v2": 2,
  "3v3": 3,
} as const satisfies Record<TournamentFormat, number>;

export interface NamedParticipant {
  team: { name: string } | null;
  players?: readonly { name: string }[];
}

export const participantName = (participant: NamedParticipant) =>
  participant.team?.name ?? (participant.players ?? []).map(({ name }) => name).join(" / ");

export interface PicturedParticipant {
  team: ThemedLogo | null;
  players?: readonly { imageUrl: string | null }[];
}

/** A duo without a team has no single picture, so only a lone player stands in for the logo. */
export const participantLogo = (participant: PicturedParticipant) => {
  if (participant.team !== null) {
    return participant.team;
  }

  const players = participant.players ?? [];

  return players.length === 1 ? { imageUrl: players[0]?.imageUrl ?? null } : null;
};
