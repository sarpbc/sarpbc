import { UpsertLeagueCommand } from "../../../tournament/application/feed";
import { LeagueDto } from "../dto/tournament.dto";

export function toUpsertLeagueCommand(dto: LeagueDto): UpsertLeagueCommand {
  return {
    pandascoreId: dto.id,
    name: dto.name,
    slug: dto.slug,
    url: dto.url,
    imageUrl: dto.image_url,
    modifiedAt:
      dto.modified_at !== undefined && dto.modified_at !== ""
        ? new Date(dto.modified_at)
        : undefined,
  };
}
