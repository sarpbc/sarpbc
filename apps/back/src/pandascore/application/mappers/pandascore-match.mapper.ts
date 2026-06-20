import { UpsertMatchCommand } from "../commands/upsert-match.command";
import { MatchDto } from "../../infrastructure/dto/match.dto";

export class PandascoreMatchMapper {
  static toUpsertCommand(dto: MatchDto): UpsertMatchCommand {
    const opponentSlugs: string[] = [];
    if (dto.opponents) {
      for (const opponentWrapper of dto.opponents) {
        const slug = opponentWrapper.opponent?.slug;
        if (slug) {
          opponentSlugs.push(slug);
        }
      }
    }

    return {
      pandascoreId: dto.id,
      tournamentPandascoreId: dto.tournament_id,
      name: dto.name ?? "TBD",
      slug: dto.slug,
      beginAt: dto.begin_at ? new Date(dto.begin_at) : undefined,
      endAt: dto.end_at ? new Date(dto.end_at) : undefined,
      status: dto.status,
      numberOfGames: dto.number_of_games ?? 0,
      opponentSlugs,
      results: (dto.results ?? []).map((result) => ({
        teamPandascoreId: result.team_id,
        score: result.score,
      })),
      previousMatches: (dto.previous_matches ?? []).map((previousMatch) => ({
        type: previousMatch.type,
        matchPandascoreId: previousMatch.match_id,
      })),
    };
  }
}
