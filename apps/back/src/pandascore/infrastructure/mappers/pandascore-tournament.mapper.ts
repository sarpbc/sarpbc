import {
  UpsertTournamentParticipantCommand,
  UpsertTournamentCommand,
} from "../../../tournament/application/feed";
import { ExpectedRosterDto, TournamentDto } from "../dto/tournament.dto";
import { toUpsertLeagueCommand } from "./pandascore-league.mapper";
import { toUpsertPlayerCommand } from "./pandascore-player.mapper";
import { toUpsertSerieCommand } from "./pandascore-serie.mapper";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";

function toParticipantCommand(dto: ExpectedRosterDto): UpsertTournamentParticipantCommand {
  return {
    team: toUpsertTeamCommand(dto.team),
    players: dto.players.map((player) => toUpsertPlayerCommand(player)),
  };
}

export function toUpsertTournamentCommand(dto: TournamentDto): UpsertTournamentCommand {
  return {
    pandascoreId: dto.id,
    name: dto.name,
    serie: dto.serie ? toUpsertSerieCommand(dto.serie) : undefined,
    tier: dto.tier,
    beginAt: dto.begin_at !== undefined && dto.begin_at !== "" ? new Date(dto.begin_at) : undefined,
    endAt: dto.end_at !== undefined && dto.end_at !== "" ? new Date(dto.end_at) : undefined,
    prizepool:
      dto.prizepool === null || dto.prizepool === undefined ? undefined : String(dto.prizepool),
    type: dto.type,
    country: dto.country ?? undefined,
    hasBracket: dto.has_bracket,
    winnerType: dto.winner_type,
    winnerPandascoreTeamId: dto.winner_id,
    league: dto.league ? toUpsertLeagueCommand(dto.league) : undefined,
    expectedRoster: dto.expected_roster?.map((roster) => toParticipantCommand(roster)),
  };
}
