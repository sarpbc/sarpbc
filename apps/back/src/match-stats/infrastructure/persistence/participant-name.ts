import { participantName } from "@sarpbc/utils";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";

export const nameOf = (participant: TournamentParticipant) =>
  participantName({ players: participant.players.getItems(), team: participant.team });
