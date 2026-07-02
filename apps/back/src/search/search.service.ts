import { Injectable } from "@nestjs/common";
import { PlayerService } from "../player/player.service";
import { TeamService } from "../team/team.service";
import {
  SearchResult,
  SearchParams,
  PlayerSearchParams,
  TeamSearchParams,
} from "./interfaces/search-result.interface";
import { Player } from "../player/player.entities";
import { Team } from "../player/player.entities";

@Injectable()
export class SearchService {
  constructor(
    private readonly playerService: PlayerService,
    private readonly teamService: TeamService,
  ) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const { query, type, limit, offset } = params;

    let players: Player[] = [];
    let teams: Team[] = [];
    let totalPlayers = 0;
    let totalTeams = 0;

    if (type === "all" || type === "player") {
      players = await this.playerService.find({
        name: query,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      });
      totalPlayers = players.length;
    }

    if (type === "all" || type === "team") {
      teams = await this.teamService.find({
        name: query,
        limit: type === "all" ? Math.ceil(limit / 2) : limit,
        offset: type === "all" ? Math.floor(offset / 2) : offset,
      });
      totalTeams = teams.length;
    }

    return {
      players,
      teams,
      total: {
        players: totalPlayers,
        teams: totalTeams,
      },
    };
  }

  async searchPlayers(params: PlayerSearchParams) {
    const { query, limit, offset } = params;
    return this.playerService.find({
      name: query,
      limit,
      offset,
    });
  }

  async searchTeams(params: TeamSearchParams) {
    const { query, limit, offset } = params;
    return this.teamService.find({
      name: query,
      limit,
      offset,
    });
  }
}
