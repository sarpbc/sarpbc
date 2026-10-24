import { ImportedPlayer, UpsertPlayerCommand } from "../../../roster/application/imports";
import { CurrentPlayerDto } from "../dto/incident.dto";
import { PlayerDto } from "../dto/tournament.dto";
import { PandascoreTeamMapper } from "./pandascore-team.mapper";

export class PandascorePlayerMapper {
  static toImportedPlayer(dto: CurrentPlayerDto): ImportedPlayer {
    return {
      player: PandascorePlayerMapper.toUpsertCommand(dto),
      currentTeam: dto.current_team ? PandascoreTeamMapper.toUpsertCommand(dto.current_team) : null,
    };
  }

  static toUpsertCommand(dto: PlayerDto, teamSlug?: string): UpsertPlayerCommand {
    return {
      pandascoreId: dto.id,
      name: dto.name,
      slug: dto.slug,
      firstName: dto.first_name,
      lastName: dto.last_name ?? undefined,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      nationality: dto.nationality,
      imageUrl: dto.image_url ?? undefined,
      role: dto.role,
      teamSlug,
    };
  }
}
