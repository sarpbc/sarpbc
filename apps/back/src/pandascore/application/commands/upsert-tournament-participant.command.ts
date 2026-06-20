import { UpsertPlayerCommand } from "./upsert-player.command";
import { UpsertTeamCommand } from "./upsert-team.command";

export interface UpsertTournamentParticipantCommand {
  team: UpsertTeamCommand;
  players: UpsertPlayerCommand[];
}
