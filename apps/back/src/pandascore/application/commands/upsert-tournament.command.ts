import { UpsertLeagueCommand } from "./upsert-league.command";
import { UpsertSerieCommand } from "./upsert-serie.command";
import { UpsertTournamentParticipantCommand } from "./upsert-tournament-participant.command";

export interface UpsertTournamentCommand {
  pandascoreId: number;
  name: string;
  serie?: UpsertSerieCommand;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  prizepool?: string;
  type?: string;
  country?: string;
  hasBracket?: boolean;
  winnerType?: string;
  winnerPandascoreTeamId?: number | null;
  league?: UpsertLeagueCommand;
  expectedRoster?: UpsertTournamentParticipantCommand[];
}
