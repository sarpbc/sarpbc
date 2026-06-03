import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TeamDto, TournamentDto } from "./dto/tournament.dto";
import { RostersListDto } from "./dto/roster.dto";
import { MatchesListDto } from "./dto/match.dto";

interface Player {
  active: boolean;
  age?: number;
  birthday?: string;
  current_team?: {
    id: number;
    name: string;
    slug: string;
    acronym?: string;
    image_url?: string;
  };
  current_videogame?: {
    id: number;
    name: string;
    slug: string;
  };
  first_name?: string;
  id: number;
  image_url?: string;
  last_name?: string;
  modified_at: string;
  name: string;
  nationality?: string;
  role?: string;
  slug: string;
}

@Injectable()
export class PandascoreService {
  private readonly logger = new Logger(PandascoreService.name);
  private readonly pandascoreApiUrl = "https://api.pandascore.co";
  private readonly pandascoreApiToken: string;

  constructor(private readonly configService: ConfigService) {
    const pandascoreApiToken = this.configService.get("pandascore_api_token");
    if (!pandascoreApiToken) {
      this.logger.error("PANDASCORE_API_TOKEN not configured");
      throw new Error("PandaScore API token not configured");
    }
    this.pandascoreApiToken = pandascoreApiToken;
  }

  async getTournaments(): Promise<TournamentDto[]> {
    try {
      // Fetch past tournaments
      const pastTournaments = await this.fetchTournamentsFromEndpoint(
        `${this.pandascoreApiUrl}/rl/tournaments/past`,
        "past",
      );

      // Fetch upcoming tournaments
      const upcomingTournaments = await this.fetchTournamentsFromEndpoint(
        `${this.pandascoreApiUrl}/rl/tournaments/upcoming`,
        "upcoming",
      );

      // Combine and deduplicate by pandascoreId
      const allTournaments = [...pastTournaments, ...upcomingTournaments];
      const uniqueTournaments = Array.from(new Map(allTournaments.map((t) => [t.id, t])).values());

      this.logger.log(
        `Fetched total ${uniqueTournaments.length} tournaments (${pastTournaments.length} past, ${upcomingTournaments.length} upcoming)`,
      );

      return uniqueTournaments;
    } catch (error) {
      this.logger.error("Failed to fetch tournaments from PandaScore", error);
      return [];
    }
  }

  private async fetchTournamentsFromEndpoint(
    baseUrl: string,
    type: "past" | "upcoming",
  ): Promise<TournamentDto[]> {
    try {
      let allTournaments: TournamentDto[] = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(`${baseUrl}?page=${page}&per_page=${perPage}`, {
          headers: {
            Authorization: `Bearer ${this.pandascoreApiToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          this.logger.error(
            `Failed to fetch ${type} tournaments from PandaScore: ${response.status} ${response.statusText}`,
          );
          return allTournaments;
        }

        const tournaments = await response.json();

        this.logger.debug(
          `Fetched ${tournaments.length} ${type} tournaments from PandaScore (page ${page})`,
        );

        if (tournaments.length === 0) {
          hasMore = false;
        } else {
          allTournaments = allTournaments.concat(tournaments);
          page++;

          if (tournaments.length < perPage) {
            hasMore = false;
          }
        }

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return allTournaments;
    } catch (error) {
      this.logger.error(`Failed to fetch ${type} tournaments from PandaScore`, error);
      return [];
    }
  }

  async getTournamentById(tournamentId: number): Promise<TournamentDto | null> {
    try {
      const response = await fetch(`${this.pandascoreApiUrl}/tournaments/${tournamentId}`, {
        headers: {
          Authorization: `Bearer ${this.pandascoreApiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch tournament from PandaScore: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const pandaTournament = await response.json();
      return pandaTournament;
    } catch (error) {
      this.logger.error(`Error fetching tournament from PandaScore: ${error.message}`);
      return null;
    }
  }

  async getTournamentRosters(tournamentId: number): Promise<RostersListDto | null> {
    try {
      const response = await fetch(`${this.pandascoreApiUrl}/tournaments/${tournamentId}/rosters`, {
        headers: {
          Authorization: `Bearer ${this.pandascoreApiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch rosters from PandaScore: ${response.status} ${response.statusText}`,
        );
        return null;
      }
      const rosters = await response.json();
      return rosters;
    } catch (error) {
      this.logger.error(`Error fetching rosters from PandaScore: ${error.message}`);
      return null;
    }
  }

  async getTournamentTeams(tournamentId: number): Promise<TeamDto[] | null> {
    try {
      const response = await fetch(`${this.pandascoreApiUrl}/tournaments/${tournamentId}/teams`, {
        headers: {
          Authorization: `Bearer ${this.pandascoreApiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch teams from PandaScore: ${response.status} ${response.statusText}`,
        );
        return null;
      }
      const teams = await response.json();
      return teams;
    } catch (error) {
      this.logger.error(`Error fetching teams from PandaScore: ${error.message}`);
      return null;
    }
  }

  async getRocketLeaguePlayers(): Promise<Player[]> {
    const allPlayers: Player[] = [];
    let page = 1;
    let hasMorePages = true;

    try {
      while (hasMorePages) {
        this.logger.debug(`Fetching players page ${page} from PandaScore API...`);

        const params = new URLSearchParams({
          sort: "name",
          page: String(page),
          per_page: "100",
        });

        const response = await fetch(`${this.pandascoreApiUrl}/rl/players?${params.toString()}`, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${this.pandascoreApiToken}`,
          },
        });

        if (!response.ok) {
          this.logger.error(`PandaScore API Error ${response.status}: ${response.statusText}`);
          return allPlayers;
        }

        const players: Player[] = await response.json();
        allPlayers.push(...players);

        this.logger.debug(
          `Page ${page}: Found ${players.length} players (Total: ${allPlayers.length})`,
        );

        const total = response.headers.get("x-total");
        if (total && allPlayers.length >= parseInt(total, 10)) {
          hasMorePages = false;
        } else if (players.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }

        if (hasMorePages) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      this.logger.log(`Completed fetching all pages. Total players: ${allPlayers.length}`);
      return allPlayers;
    } catch (error) {
      this.logger.error("Failed to fetch Rocket League players from PandaScore", error);
      return allPlayers;
    }
  }

  async getTournamentBrackets(tournamentId: number): Promise<MatchesListDto> {
    try {
      let allMatches: MatchesListDto = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `${this.pandascoreApiUrl}/tournaments/${tournamentId}/brackets?page=${page}&per_page=${perPage}`,
          {
            headers: {
              Authorization: `Bearer ${this.pandascoreApiToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          this.logger.error("Failed to fetch brackets from PandaScore", {
            status: response.status,
            statusText: response.statusText,
          });
          return [];
        }

        const matches = await response.json();

        if (matches.length === 0) {
          hasMore = false;
        } else {
          allMatches = allMatches.concat(matches);
          page += 1;

          if (matches.length < perPage) {
            hasMore = false;
          }
        }

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return allMatches;
    } catch (error) {
      this.logger.error("Failed to fetch matches from PandaScore", { error });
      return [];
    }
  }
}
