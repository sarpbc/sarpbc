import { UpsertLeagueCommand } from "./upsert-league.command";
import { UpsertTournamentParticipantCommand } from "./upsert-tournament-participant.command";

export interface UpsertTournamentCommand {
  pandascoreId: number;
  name: string;
  slug?: string;
  serie?: string;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  prizepool?: string;
  type?: string;
  hasBracket?: boolean;
  winnerType?: string;
  winnerPandascoreTeamId?: number | null;
  league?: UpsertLeagueCommand;
  expectedRoster?: UpsertTournamentParticipantCommand[];
}
