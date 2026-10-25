import {
  UpsertTournamentParticipantCommand,
  UpsertTournamentCommand,
} from "../../../tournament/application/feed";
import { ExpectedRosterDto, TournamentDto } from "../dto/tournament.dto";
import { PandascoreLeagueMapper } from "./pandascore-league.mapper";
import { PandascorePlayerMapper } from "./pandascore-player.mapper";
import { PandascoreSerieMapper } from "./pandascore-serie.mapper";
import { PandascoreTeamMapper } from "./pandascore-team.mapper";

export class PandascoreTournamentMapper {
  static toUpsertCommand(dto: TournamentDto): UpsertTournamentCommand {
    return {
      pandascoreId: dto.id,
      name: dto.name,
      serie: dto.serie ? PandascoreSerieMapper.toUpsertCommand(dto.serie) : undefined,
      tier: dto.tier,
      beginAt: dto.begin_at ? new Date(dto.begin_at) : undefined,
      endAt: dto.end_at ? new Date(dto.end_at) : undefined,
      prizepool: dto.prizepool != null ? String(dto.prizepool) : undefined,
      type: dto.type,
      country: dto.country ?? undefined,
      hasBracket: dto.has_bracket,
      winnerType: dto.winner_type,
      winnerPandascoreTeamId: dto.winner_id,
      league: dto.league ? PandascoreLeagueMapper.toUpsertCommand(dto.league) : undefined,
      expectedRoster: dto.expected_roster?.map((roster) => this.toParticipantCommand(roster)),
    };
  }

  static toParticipantCommand(dto: ExpectedRosterDto): UpsertTournamentParticipantCommand {
    const teamSlug = dto.team.slug;
    return {
      team: PandascoreTeamMapper.toUpsertCommand(dto.team),
      players: dto.players.map((player) =>
        PandascorePlayerMapper.toUpsertCommand(player, teamSlug),
      ),
    };
  }
}
