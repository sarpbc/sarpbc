import { TeamDto } from "../dto/tournament.dto";

export const toUpsertTeamCommand = (dto: TeamDto) => ({
  darkModeImageUrl: dto.dark_mode_image_url ?? undefined,
  imageUrl: dto.image_url,
  location: dto.location,
  name: dto.name,
  pandascoreId: dto.id,
  slug: dto.slug,
});
