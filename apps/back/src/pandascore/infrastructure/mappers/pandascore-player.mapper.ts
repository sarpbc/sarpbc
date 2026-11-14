import { ImportedPlayer, UpsertPlayerCommand } from "../../../roster/application/imports";
import { CurrentPlayerDto } from "../dto/incident.dto";
import { PlayerDto } from "../dto/tournament.dto";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";

export const toUpsertPlayerCommand = (dto: PlayerDto): UpsertPlayerCommand => ({
  pandascoreId: dto.id,
  name: dto.name,
  slug: dto.slug,
  firstName: dto.first_name,
  lastName: dto.last_name ?? undefined,
  birthday: dto.birthday !== undefined && dto.birthday !== "" ? new Date(dto.birthday) : undefined,
  nationality: dto.nationality,
  imageUrl: dto.image_url ?? undefined,
  role: dto.role,
});

export const toImportedPlayer = (dto: CurrentPlayerDto): ImportedPlayer => ({
  player: toUpsertPlayerCommand(dto),
  currentTeam: dto.current_team ? toUpsertTeamCommand(dto.current_team) : null,
});
