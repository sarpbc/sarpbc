import type { PlayerService } from "../../player/application/player.service";
import type { TeamService } from "../../team/application/team.service";
import type { TournamentService } from "../../tournament/application/tournament.service";
import {
  SearchResult,
  SearchParams,
  PlayerSearchParams,
  TeamSearchParams,
  TournamentSearchParams,
} from "./models/search-result";
import type { Player, Team } from "../../player/domain/roster";
import type { Tournament } from "../../tournament/domain/competition";

export class SearchService {
  constructor(
    private readonly playerService: Pick<PlayerService, "find">,
    private readonly teamService: Pick<TeamService, "find">,
    private readonly tournamentService: Pick<TournamentService, "searchByName">,
  ) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const { query, type, limit, offset } = params;
    const sharedLimit = type === "all" ? Math.ceil(limit / 2) : limit;
    const sharedOffset = type === "all" ? Math.floor(offset / 2) : offset;

    let players: Player[] = [];
    let teams: Team[] = [];
    let tournaments: Tournament[] = [];

    if (type === "all" || type === "player") {
      players = await this.playerService.find({
        name: query,
        limit: sharedLimit,
        offset: sharedOffset,
      });
    }

    if (type === "all" || type === "team") {
      teams = await this.teamService.find({
        name: query,
        limit: sharedLimit,
        offset: sharedOffset,
      });
    }

    if (type === "all" || type === "tournament") {
      tournaments = await this.tournamentService.searchByName({
        name: query,
        limit: sharedLimit,
        offset: sharedOffset,
      });
    }

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

  async searchTournaments(params: TournamentSearchParams) {
    const { query, limit, offset } = params;
    return this.tournamentService.searchByName({
      name: query,
      limit,
      offset,
    });
  }
}
