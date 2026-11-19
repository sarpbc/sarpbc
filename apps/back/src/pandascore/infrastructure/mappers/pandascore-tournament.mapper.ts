import { ExpectedRosterDto, TournamentDto } from "../dto/tournament.dto";
import { toUpsertLeagueCommand } from "./pandascore-league.mapper";
import { toUpsertPlayerCommand } from "./pandascore-player.mapper";
import { toUpsertSerieCommand } from "./pandascore-serie.mapper";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";

const toParticipantCommand = (dto: ExpectedRosterDto) => ({
  players: dto.players.map((player) => toUpsertPlayerCommand(player)),
  team: toUpsertTeamCommand(dto.team),
});

export const toUpsertTournamentCommand = (dto: TournamentDto) => ({
  beginAt: dto.begin_at !== undefined && dto.begin_at !== "" ? new Date(dto.begin_at) : undefined,
  country: dto.country ?? undefined,
  endAt: dto.end_at !== undefined && dto.end_at !== "" ? new Date(dto.end_at) : undefined,
  expectedRoster: dto.expected_roster?.map((roster) => toParticipantCommand(roster)),
  hasBracket: dto.has_bracket,
  league: dto.league ? toUpsertLeagueCommand(dto.league) : undefined,
  name: dto.name,
  pandascoreId: dto.id,
  prizepool:
    dto.prizepool === null || dto.prizepool === undefined ? undefined : String(dto.prizepool),
  serie: dto.serie ? toUpsertSerieCommand(dto.serie) : undefined,
  tier: dto.tier,
  type: dto.type,
  winnerPandascoreTeamId: dto.winner_id,
  winnerType: dto.winner_type,
});
