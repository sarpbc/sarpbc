import { UpsertPlayerCommand } from "../commands/upsert-player.command";
import { PlayerDto } from "../../infrastructure/dto/tournament.dto";

export class PandascorePlayerMapper {
  static toUpsertCommand(dto: PlayerDto, teamSlug?: string): UpsertPlayerCommand {
    return {
      name: dto.name,
      slug: dto.slug,
      firstName: dto.first_name,
      lastName: dto.last_name ?? undefined,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      nationality: dto.nationality,
      imageUrl: dto.image_url ?? undefined,
      role: dto.role,
      teamSlug,
    };
  }

  static fromRocketLeaguePlayer(dto: {
    name: string;
    slug: string;
    first_name?: string;
    last_name?: string;
    birthday?: string;
    nationality?: string;
    image_url?: string;
    role?: string | null;
    current_team?: { slug: string };
  }): UpsertPlayerCommand {
    return {
      name: dto.name,
      slug: dto.slug,
      firstName: dto.first_name,
      lastName: dto.last_name,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      nationality: dto.nationality,
      imageUrl: dto.image_url,
      role: dto.role ?? null,
      teamSlug: dto.current_team?.slug,
    };
  }
}
