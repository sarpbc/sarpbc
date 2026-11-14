import { UpsertMatchCommand } from "../../../tournament/application/feed";
import { MatchDto } from "../dto/match.dto";
import { mapOfficialMatchStreams } from "./official-match-streams";

export class PandascoreMatchMapper {
  static toUpsertCommand(dto: MatchDto): UpsertMatchCommand {
    const opponentSlugs: string[] = [];

    for (const opponentWrapper of dto.opponents) {
      const slug = opponentWrapper.opponent?.slug;

      if (slug !== undefined && slug !== "") {
        opponentSlugs.push(slug);
      }
    }

    return {
      pandascoreId: dto.id,
      tournamentPandascoreId: dto.tournament_id,
      name: dto.name ?? "TBD",
      beginAt:
        dto.begin_at !== undefined && dto.begin_at !== "" ? new Date(dto.begin_at) : undefined,
      endAt: dto.end_at !== undefined && dto.end_at !== "" ? new Date(dto.end_at) : undefined,
      status: dto.status,
      numberOfGames: dto.number_of_games ?? 0,
      opponentSlugs,
      opponentPandascoreIds: (dto.opponents ?? []).flatMap((o) =>
        o.opponent?.id !== undefined && o.opponent.id !== 0 ? [o.opponent.id] : [],
      ),
      results: (dto.results ?? []).map((result) => ({
        teamPandascoreId: result.team_id,
        score: result.score,
      })),
      previousMatches: (dto.previous_matches ?? []).map((previousMatch) => ({
        type: previousMatch.type,
        matchPandascoreId: previousMatch.match_id,
      })),
      officialStreams: mapOfficialMatchStreams(dto.streams_list),
    };
  }
}
