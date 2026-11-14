import type { SearchType } from "@sarpbc/types";
import type { PlayerService } from "../../roster/application/player.service";
import type { TeamService } from "../../roster/application/team.service";
import type { TournamentQueries } from "../../tournament/application/ports";
import { SearchResult, SearchParams } from "./models/search-result";
import type { Player, Team } from "../../roster/domain/roster";
import type { Tournament } from "../../tournament/domain/competition";

function pageForEachKind({ type, limit, offset }: SearchParams) {
  const mixed = type === "all";

  return {
    limit: mixed ? Math.ceil(limit / 2) : limit,
    offset: mixed ? Math.floor(offset / 2) : offset,
  };
}

function includes(type: SearchType, kind: Exclude<SearchType, "all">): boolean {
  return type === "all" || type === kind;
}

export class SearchService {
  constructor(
    private readonly playerService: Pick<PlayerService, "find">,
    private readonly teamService: Pick<TeamService, "find">,
    private readonly tournamentService: Pick<TournamentQueries, "searchByName">,
  ) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const { query, type } = params;
    const page = { name: query, ...pageForEachKind(params) };

    let players: Player[] = [];
    let teams: Team[] = [];
    let tournaments: Tournament[] = [];

    if (includes(type, "player")) players = await this.playerService.find(page);

    if (includes(type, "team")) teams = await this.teamService.find(page);

    if (includes(type, "tournament")) tournaments = await this.tournamentService.searchByName(page);

    return {
      players,
      teams,
      tournaments,
      total: {
        players: players.length,
        teams: teams.length,
        tournaments: tournaments.length,
      },
    };
  }
}
