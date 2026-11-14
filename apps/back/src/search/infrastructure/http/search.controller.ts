import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "../../application/search.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import type { SearchQueryInput } from "./dto/search-query.dto";
import { mapPlayer, mapTeam } from "../../../roster/infrastructure/http/player.mapper";
import { mapTournament } from "../../../tournament/infrastructure/http/tournament.mapper";

const searchCriteria = (query: SearchQueryInput) => ({
  limit: query.limit,
  offset: query.offset,
  query: query.q ?? "",
});

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query({ schema: SearchQueryDto }) query: SearchQueryInput) {
    const result = await this.searchService.search({
      ...searchCriteria(query),
      type: query.type ?? "all",
    });

    return {
      players: result.players.map((player) => mapPlayer(player)),
      teams: result.teams.map((team) => mapTeam(team)),
      total: result.total,
      tournaments: result.tournaments.map((tournament) => mapTournament(tournament)),
    };
  }

  @Get("players")
  async searchPlayers(@Query({ schema: SearchQueryDto }) query: SearchQueryInput) {
    const { players } = await this.searchService.search({
      ...searchCriteria(query),
      type: "player",
    });

    return players.map((player) => mapPlayer(player));
  }

  @Get("teams")
  async searchTeams(@Query({ schema: SearchQueryDto }) query: SearchQueryInput) {
    const { teams } = await this.searchService.search({ ...searchCriteria(query), type: "team" });

    return teams.map((team) => mapTeam(team));
  }

  @Get("tournaments")
  async searchTournaments(@Query({ schema: SearchQueryDto }) query: SearchQueryInput) {
    const { tournaments } = await this.searchService.search({
      ...searchCriteria(query),
      type: "tournament",
    });

    return tournaments.map((tournament) => mapTournament(tournament));
  }
}
