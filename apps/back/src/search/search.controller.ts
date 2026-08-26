import { Controller, Get, Query } from "@nestjs/common";
import { SearchResult } from "./interfaces/search-result.interface";
import { SearchService } from "./search.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { mapPlayer, mapTeam } from "../player/player.mapper";
import { mapTournament } from "../tournament/tournament.mapper";
import { Player } from "../player/player.entities";
import { Team } from "../player/player.entities";
import { Tournament } from "../tournament/tournament.entities";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto) {
    const result: SearchResult = await this.searchService.search({
      query: query.q ?? "",
      type: query.type ?? "all",
      limit: query.limit,
      offset: query.offset,
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
    const players: Player[] = await this.searchService.searchPlayers({
      query: query.q ?? "",
      limit: query.limit,
      offset: query.offset,
    });
    return players.map((player) => mapPlayer(player));
  }

  @Get("teams")
  async searchTeams(@Query() query: SearchQueryDto) {
    const teams: Team[] = await this.searchService.searchTeams({
      query: query.q ?? "",
      limit: query.limit,
      offset: query.offset,
    });
    return teams.map((team) => mapTeam(team));
  }

  @Get("tournaments")
  async searchTournaments(@Query() query: SearchQueryDto) {
    const tournaments: Tournament[] = await this.searchService.searchTournaments({
      query: query.q ?? "",
      limit: query.limit,
      offset: query.offset,
    });
    return tournaments.map((tournament) => mapTournament(tournament));
  }
}
