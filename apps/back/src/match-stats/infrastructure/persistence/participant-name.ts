import { participantName } from "@sarpbc/utils";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";

export const nameOf = (participant: TournamentParticipant): string =>
  participantName({ players: participant.players.getItems(), team: participant.team });
