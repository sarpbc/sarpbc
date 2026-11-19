import { LeagueDto } from "../dto/tournament.dto";

export const toUpsertLeagueCommand = (dto: LeagueDto) => ({
  imageUrl: dto.image_url,
  modifiedAt:
    dto.modified_at !== undefined && dto.modified_at !== "" ? new Date(dto.modified_at) : undefined,
  name: dto.name,
  pandascoreId: dto.id,
  slug: dto.slug,
  url: dto.url,
});
