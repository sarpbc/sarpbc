import type { ParticipantRef } from "@sarpbc/types";
import type { Team } from "../../../roster/domain/team";
import type { TournamentParticipant } from "../../domain/tournament-participant";

export const mapParticipantRef = <TTeam>(
  participant: TournamentParticipant,
  mapTeam: (team: Team) => TTeam,
): ParticipantRef<TTeam> =>
  participant.team
    ? { id: participant.id, team: mapTeam(participant.team) }
    : {
        id: participant.id,
        team: null,
        players: participant.players.map(({ id, name, slug }) => ({ id, name, slug })),
      };
