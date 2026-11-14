import type { UpsertTeamCommand } from "../../../roster/application/imports";
import type { TeamDto } from "../dto/tournament.dto";

export function toUpsertTeamCommand(dto: TeamDto): UpsertTeamCommand {
  return {
    pandascoreId: dto.id,
    name: dto.name,
    slug: dto.slug,
    location: dto.location,
    imageUrl: dto.image_url,
    darkModeImageUrl: dto.dark_mode_image_url ?? undefined,
  };
}
