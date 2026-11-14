import { UpsertTeamCommand } from "../../../roster/application/imports";
import { TeamDto } from "../dto/tournament.dto";

export const toUpsertTeamCommand = (dto: TeamDto): UpsertTeamCommand => ({
  pandascoreId: dto.id,
  name: dto.name,
  slug: dto.slug,
  location: dto.location,
  imageUrl: dto.image_url,
  darkModeImageUrl: dto.dark_mode_image_url ?? undefined,
});
