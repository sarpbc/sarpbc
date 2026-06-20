import { UpsertTeamCommand } from "../commands/upsert-team.command";
import { TeamDto } from "../../infrastructure/dto/tournament.dto";

export class PandascoreTeamMapper {
  static toUpsertCommand(dto: TeamDto): UpsertTeamCommand {
    return {
      pandascoreId: dto.id,
      name: dto.name,
      slug: dto.slug,
      location: dto.location,
      imageUrl: dto.image_url,
    };
  }

  static fromCurrentTeam(currentTeam: {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
  }): UpsertTeamCommand {
    return {
      pandascoreId: currentTeam.id,
      name: currentTeam.name,
      slug: currentTeam.slug,
      imageUrl: currentTeam.image_url,
    };
  }
}
