import { participantName } from "@sarpbc/utils";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";

export function nameOf(participant: TournamentParticipant): string {
  return participantName({ team: participant.team, players: participant.players.getItems() });
}
