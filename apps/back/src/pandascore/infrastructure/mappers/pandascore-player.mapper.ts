import { CurrentPlayerDto } from "../dto/incident.dto";
import { PlayerDto } from "../dto/tournament.dto";
import { toUpsertTeamCommand } from "./pandascore-team.mapper";

export const toUpsertPlayerCommand = (dto: PlayerDto) => ({
  birthday: dto.birthday !== undefined && dto.birthday !== "" ? new Date(dto.birthday) : undefined,
  firstName: dto.first_name,
  imageUrl: dto.image_url ?? undefined,
  lastName: dto.last_name ?? undefined,
  name: dto.name,
  nationality: dto.nationality,
  pandascoreId: dto.id,
  role: dto.role,
  slug: dto.slug,
});

export const toImportedPlayer = (dto: CurrentPlayerDto) => ({
  currentTeam: dto.current_team ? toUpsertTeamCommand(dto.current_team) : null,
  player: toUpsertPlayerCommand(dto),
});
