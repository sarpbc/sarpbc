import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { mapPlayer, mapTeam } from "../player/player.mapper";
import { mapTournament } from "../tournament/tournament.mapper";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  private criteria(query: SearchQueryDto) {
    return {
      query: query.q ?? "",
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Get()
  async search(@Query() query: SearchQueryDto) {
    const result = await this.searchService.search({
      ...this.criteria(query),
      type: query.type ?? "all",
    });

    return {
      players: result.players.map((player) => mapPlayer(player)),
      teams: result.teams.map((team) => mapTeam(team)),
      tournaments: result.tournaments.map((tournament) => mapTournament(tournament)),
      total: result.total,
    };
  }

  @Get("players")
  async searchPlayers(@Query() query: SearchQueryDto) {
    const players = await this.searchService.searchPlayers(this.criteria(query));
    return players.map((player) => mapPlayer(player));
  }

  @Get("teams")
  async searchTeams(@Query() query: SearchQueryDto) {
    const teams = await this.searchService.searchTeams(this.criteria(query));
    return teams.map((team) => mapTeam(team));
  }

  @Get("tournaments")
  async searchTournaments(@Query() query: SearchQueryDto) {
    const tournaments = await this.searchService.searchTournaments(this.criteria(query));
    return tournaments.map((tournament) => mapTournament(tournament));
  }
}
