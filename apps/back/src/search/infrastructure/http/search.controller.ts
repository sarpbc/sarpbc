import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "../../application/search.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { mapPlayer, mapTeam } from "../../../roster/infrastructure/http/player.mapper";
import { mapTournament } from "../../../tournament/infrastructure/http/tournament.mapper";

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
  async search(@Query({ schema: SearchQueryDto }) query: SearchQueryDto) {
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
  async searchPlayers(@Query({ schema: SearchQueryDto }) query: SearchQueryDto) {
    const players = await this.searchService.searchPlayers(this.criteria(query));
    return players.map((player) => mapPlayer(player));
  }

  @Get("teams")
  async searchTeams(@Query({ schema: SearchQueryDto }) query: SearchQueryDto) {
    const teams = await this.searchService.searchTeams(this.criteria(query));
    return teams.map((team) => mapTeam(team));
  }

  @Get("tournaments")
  async searchTournaments(@Query({ schema: SearchQueryDto }) query: SearchQueryDto) {
    const tournaments = await this.searchService.searchTournaments(this.criteria(query));
    return tournaments.map((tournament) => mapTournament(tournament));
  }
}
