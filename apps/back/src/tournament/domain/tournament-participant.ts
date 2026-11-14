import { v4 } from "uuid";
import type { Player } from "../../roster/domain/player";
import type { Team } from "../../roster/domain/team";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export class TournamentParticipant {
  id = v4();
  tournamentId = "";
  team: Team | null = null;
  players: Player[] = [];
  rosterSourceUrl: string | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

export interface ParticipantSnapshot {
  id: string;
  tournamentId: string;
  teamId: string | null;
  playerIds: string[];
  rosterSourceUrl: string | null;
}

export interface ParticipantReferences {
  tournamentWinner: boolean;
  matchParticipant: boolean;
  matchWinner: boolean;
  results: boolean;
}

export const assertParticipantRemovable = (refs: ParticipantReferences): void => {
  if (refs.tournamentWinner) {
    throw new InvalidInputError(
      "Cannot remove a participant that is the tournament winner. Clear the winner first.",
    );
  }

  if (refs.matchParticipant) {
    throw new InvalidInputError(
      "Cannot remove a participant that already appears in matches. Remove or reassign those matches first.",
    );
  }

  if (refs.matchWinner) {
    throw new InvalidInputError(
      "Cannot remove a participant that is recorded as a match winner. Clear those winners first.",
    );
  }

  if (refs.results) {
    throw new InvalidInputError(
      "Cannot remove a participant that has match results. Remove those results first.",
    );
  }
};
