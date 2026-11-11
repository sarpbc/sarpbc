import type { TournamentFormat } from "@sarpbc/types";
import { TEAM_SIZE_BY_FORMAT } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export interface ParticipantLineup {
  teamIds: readonly string[];
  playerGroups: readonly (readonly string[])[];
}

export function playerGroupKey(playerIds: readonly string[]): string {
  return [...playerIds].sort().join(",");
}

export function assertLineupFitsFormat(format: TournamentFormat, lineup: ParticipantLineup): void {
  switch (format) {
    case "1v1":
      if (lineup.teamIds.length)
        throw new InvalidInputError(
          "A 1v1 tournament has players as participants, not teams. Pass them in playerParticipants.",
        );
      break;
    case "2v2":
      break;
    case "3v3":
      if (lineup.playerGroups.length)
        throw new InvalidInputError(
          "A 3v3 tournament has teams as participants. Pass them in teamIds, or change the format to 1v1 or 2v2.",
        );
      break;
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
  const size = TEAM_SIZE_BY_FORMAT[format];
  if (lineup.playerGroups.some((group) => new Set(group).size !== size))
    throw new InvalidInputError(
      `Each participant of a ${format} tournament without a team has exactly ${size} different player${size === 1 ? "" : "s"}.`,
    );
  const players = lineup.playerGroups.flat();
  if (new Set(players).size !== players.length)
    throw new InvalidInputError("A player can only be in one participant of a tournament.");
}
