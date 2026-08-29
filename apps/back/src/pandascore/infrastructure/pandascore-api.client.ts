import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PandascoreAdditionType, PandascoreAdditionsListDto } from "./dto/addition.dto";
import { MatchDto } from "./dto/match.dto";
import { TournamentDto } from "./dto/tournament.dto";
import { PandascoreApiError } from "./pandascore-api.errors";
import { log } from "evlog";

export interface PandascoreQueryParams {
  page?: string;
  per_page?: string;
  sort?: string;
  since?: string;
  type?: PandascoreAdditionType[];
  videogame?: string[];
}

export interface PandascoreRequestOptions {
  params?: PandascoreQueryParams;
  paginate?: boolean;
  perPage?: number;
  rateLimitMs?: number;
}

export interface RocketLeaguePlayerDto {
  active: boolean;
  age?: number;
  birthday?: string;
  current_team?: {
    id: number;
    name: string;
    slug: string;
    acronym?: string;
    image_url?: string;
    dark_mode_image_url?: string | null;
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

export interface ListAdditionsClientParams {
  since?: Date;
  type?: PandascoreAdditionType[];
  videogame?: string[];
  page?: number;
  perPage?: number;
  sort?: "modified_at" | "-modified_at" | "id" | "-id";
}

@Injectable()
export class PandascoreApiClient {
  private readonly baseUrl = "https://api.pandascore.co";
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    const apiToken = this.configService.get<string>("pandascore_api_token");
    if (!apiToken) {
      log.error({
        component: PandascoreApiClient.name,
        message: "PANDASCORE_API_TOKEN not configured",
      });
      throw new Error("PandaScore API token not configured");
    }
    this.apiToken = apiToken;
  }

  async listAdditions(params: ListAdditionsClientParams = {}): Promise<PandascoreAdditionsListDto> {
    const query: PandascoreQueryParams = {
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 100),
      sort: params.sort ?? "modified_at",
    };

    if (params.since) {
      query.since = params.since.toISOString();
    }
    if (params.type?.length) {
      query.type = params.type;
    }
    if (params.videogame?.length) {
      query.videogame = params.videogame;
    }

    return this.paginateAll<PandascoreAdditionsListDto[number]>("/additions", {
      params: query,
      perPage: params.perPage ?? 100,
    });
  }

  async getTournaments(): Promise<TournamentDto[]> {
    const pastTournaments = await this.paginateAll<TournamentDto>("/rl/tournaments/past");
    const upcomingTournaments = await this.paginateAll<TournamentDto>("/rl/tournaments/upcoming");
    const runningTournaments = await this.paginateAll<TournamentDto>("/rl/tournaments/running");
    const allTournaments = [...pastTournaments, ...upcomingTournaments, ...runningTournaments];
    const byId = new Map<number, TournamentDto>();
    for (const tournament of allTournaments) {
      if (!byId.has(tournament.id)) {
        byId.set(tournament.id, tournament);
      }
    }
    return Array.from(byId.values());
  }

  async getTournamentById(tournamentId: number): Promise<TournamentDto | null> {
    try {
      return await this.request<TournamentDto>(`/tournaments/${tournamentId}`);
    } catch (error) {
      if (error instanceof PandascoreApiError && error.status === 404) {
        return null;
      }
      log.warn({
        component: PandascoreApiClient.name,
        tournamentId,
        message: "Failed to fetch tournament",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getTournamentBrackets(tournamentId: number): Promise<MatchDto[]> {
    return this.paginateAll<MatchDto>(`/tournaments/${tournamentId}/brackets`);
  }

  async getTournamentMatches(tournamentId: number): Promise<MatchDto[]> {
    return this.paginateAll<MatchDto>(`/tournaments/${tournamentId}/matches`);
  }

  async getRocketLeaguePlayers(): Promise<RocketLeaguePlayerDto[]> {
    return this.paginateAll<RocketLeaguePlayerDto>("/rl/players", {
      params: { sort: "name" },
      rateLimitMs: 200,
    });
  }

  private async paginateAll<T>(path: string, options: PandascoreRequestOptions = {}): Promise<T[]> {
    const perPage = options.perPage ?? 100;
    const rateLimitMs = options.rateLimitMs ?? 100;
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const items = await this.request<T[]>(path, {
        ...options,
        params: {
          ...options.params,
          page: String(page),
          per_page: String(perPage),
        },
      });

      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems.push(...items);
        page += 1;
        if (items.length < perPage) {
          hasMore = false;
        }
      }

      if (hasMore) {
        await this.sleep(rateLimitMs);
      }
    }

    return allItems;
  }

  private async request<T>(path: string, options: PandascoreRequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value === undefined) {
          continue;
        }
        if (Array.isArray(value)) {
          // PandaScore rejects `key[]=` (HTTP 500). Use repeated keys instead.
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        } else {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new PandascoreApiError(
        `PandaScore API request failed: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    return response.json() as Promise<T>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
