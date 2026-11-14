import { UpsertMatchCommand } from "../../../tournament/application/feed";
import { MatchDto } from "../dto/match.dto";
import { mapOfficialMatchStreams } from "./official-match-streams";

export const toUpsertMatchCommand = (dto: MatchDto): UpsertMatchCommand => {
  const opponentSlugs: string[] = [];

  for (const opponentWrapper of dto.opponents) {
    const slug = opponentWrapper.opponent?.slug;

    if (slug !== undefined && slug !== "") {
      opponentSlugs.push(slug);
    }
  }

  return {
    beginAt: dto.begin_at !== undefined && dto.begin_at !== "" ? new Date(dto.begin_at) : undefined,
    endAt: dto.end_at !== undefined && dto.end_at !== "" ? new Date(dto.end_at) : undefined,
    name: dto.name ?? "TBD",
    numberOfGames: dto.number_of_games ?? 0,
    officialStreams: mapOfficialMatchStreams(dto.streams_list),
    opponentPandascoreIds: (dto.opponents ?? []).flatMap((o) =>
      o.opponent?.id !== undefined && o.opponent.id !== 0 ? [o.opponent.id] : [],
    ),
    opponentSlugs,
    pandascoreId: dto.id,
    previousMatches: (dto.previous_matches ?? []).map((previousMatch) => ({
      matchPandascoreId: previousMatch.match_id,
      type: previousMatch.type,
    })),
    results: (dto.results ?? []).map((result) => ({
      score: result.score,
      teamPandascoreId: result.team_id,
    })),
    status: dto.status,
    tournamentPandascoreId: dto.tournament_id,
  };
};
