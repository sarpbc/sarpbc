import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PandascoreIncidentType } from "./dto/incident.dto";
import { z } from "zod";

import { PandascoreApiError } from "./pandascore-api.errors";
import { log } from "evlog";

export interface PandascoreQueryParams {
  page?: string;
  per_page?: string;
  sort?: string;
  since?: string;
  type?: PandascoreIncidentType[];
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

export interface ListIncidentsClientParams {
  since?: Date;
  type?: PandascoreIncidentType[];
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

  async listIncidents(params: ListIncidentsClientParams = {}): Promise<unknown[]> {
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

    return this.paginateAll("/incidents", {
      params: query,
      perPage: params.perPage ?? 100,
    });
  }

  async getTournaments(): Promise<unknown[]> {
    const pastTournaments = await this.paginateAll("/rl/tournaments/past");
    const upcomingTournaments = await this.paginateAll("/rl/tournaments/upcoming");
    const runningTournaments = await this.paginateAll("/rl/tournaments/running");
    const allTournaments = [...pastTournaments, ...upcomingTournaments, ...runningTournaments];
    const byId = new Map<number, unknown>();
    for (const tournament of allTournaments) {
      const { id } = z.object({ id: z.number().int() }).parse(tournament);
      if (!byId.has(id)) {
        byId.set(id, tournament);
      }
    }
    return Array.from(byId.values());
  }

  async getTournamentById(tournamentId: number): Promise<unknown | null> {
    try {
      return await this.request(`/tournaments/${tournamentId}`);
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

  async getTournamentBrackets(tournamentId: number): Promise<unknown[]> {
    return this.paginateAll(`/tournaments/${tournamentId}/brackets`);
  }

  async getTournamentMatches(tournamentId: number): Promise<unknown[]> {
    return this.paginateAll(`/tournaments/${tournamentId}/matches`);
  }

  async getRocketLeaguePlayers(): Promise<unknown[]> {
    return this.paginateAll("/rl/players", {
      params: { sort: "name" },
      rateLimitMs: 200,
    });
  }

  private async paginateAll(
    path: string,
    options: PandascoreRequestOptions = {},
  ): Promise<unknown[]> {
    const perPage = options.perPage ?? 100;
    const rateLimitMs = options.rateLimitMs ?? 100;
    const allItems: unknown[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const items = z.array(z.unknown()).parse(
        await this.request(path, {
          ...options,
          params: {
            ...options.params,
            page: String(page),
            per_page: String(perPage),
          },
        }),
      );

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

  private async request(path: string, options: PandascoreRequestOptions = {}): Promise<unknown> {
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

    return response.json();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
