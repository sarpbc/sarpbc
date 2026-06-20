import { UpsertLeagueCommand } from "../commands/upsert-league.command";
import { LeagueDto } from "../../infrastructure/dto/tournament.dto";

export class PandascoreLeagueMapper {
  static toUpsertCommand(dto: LeagueDto): UpsertLeagueCommand {
    return {
      pandascoreId: dto.id,
      name: dto.name,
      slug: dto.slug,
      url: dto.url,
      imageUrl: dto.image_url,
      modifiedAt: dto.modified_at ? new Date(dto.modified_at) : undefined,
    };
  }
}
