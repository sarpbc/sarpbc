import type { ImportedPlayer, UpsertPlayerCommand } from "../../../roster/application/imports";
import type { CurrentPlayerDto } from "../dto/incident.dto";
import type { PlayerDto } from "../dto/tournament.dto";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";

export function toUpsertPlayerCommand(dto: PlayerDto): UpsertPlayerCommand {
  return {
    pandascoreId: dto.id,
    name: dto.name,
    slug: dto.slug,
    firstName: dto.first_name,
    lastName: dto.last_name ?? undefined,
    birthday:
      dto.birthday !== undefined && dto.birthday !== "" ? new Date(dto.birthday) : undefined,
    nationality: dto.nationality,
    imageUrl: dto.image_url ?? undefined,
    role: dto.role,
  };
}

export function toImportedPlayer(dto: CurrentPlayerDto): ImportedPlayer {
  return {
    player: toUpsertPlayerCommand(dto),
    currentTeam: dto.current_team ? toUpsertTeamCommand(dto.current_team) : null,
  };
}
