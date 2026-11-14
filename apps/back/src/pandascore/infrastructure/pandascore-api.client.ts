import { setTimeout as sleep } from "node:timers/promises";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import { PandascoreApiError } from "./pandascore-api.errors";
import { log } from "evlog";

export interface PandascoreQueryParams {
  [key: string]: string | string[] | undefined;
  page?: string;
  per_page?: string;
  sort?: string;
  since?: string;
  videogame?: string[];
}

export interface PandascoreRequestOptions {
  params?: PandascoreQueryParams;
  perPage?: number;
  rateLimitMs?: number;
}

export interface ListIncidentsClientParams {
  since: Date;
  perPage?: number;
}

const VIDEOGAME = "rl";

const jsonSchema = z.json();

export type PandascoreJson = z.infer<typeof jsonSchema>;

@Injectable()
export class PandascoreApiClient {
  private readonly baseUrl = "https://api.pandascore.co";
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    const apiToken = this.configService.get<string>("pandascore_api_token");

    if (apiToken === undefined || apiToken === "") {
      log.error({
        component: PandascoreApiClient.name,
        message: "PANDASCORE_API_TOKEN not configured",
      });
      throw new Error("PandaScore API token not configured");
    }

    this.apiToken = apiToken;
  }

  async listIncidents({
    since,
    perPage = 100,
  }: ListIncidentsClientParams): Promise<PandascoreJson[]> {
    return await this.paginateAll("/incidents", {
      params: { sort: "modified_at", since: since.toISOString(), videogame: [VIDEOGAME] },
      perPage,
    });
  }

  async getTournaments(): Promise<PandascoreJson[]> {
    const pastTournaments = await this.paginateAll(`/${VIDEOGAME}/tournaments/past`);
    const upcomingTournaments = await this.paginateAll(`/${VIDEOGAME}/tournaments/upcoming`);
    const runningTournaments = await this.paginateAll(`/${VIDEOGAME}/tournaments/running`);
    const allTournaments = [...pastTournaments, ...upcomingTournaments, ...runningTournaments];
    const byId = new Map<number, PandascoreJson>();

    for (const tournament of allTournaments) {
      const { id } = z.object({ id: z.number().int() }).parse(tournament);

      if (!byId.has(id)) {
        byId.set(id, tournament);
      }
    }

    return [...byId.values()];
  }

  async getTournamentById(tournamentId: number): Promise<PandascoreJson | null> {
    try {
      return await this.request(`/tournaments/${tournamentId}`);
    } catch (error) {
      if (error instanceof PandascoreApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async getTournamentBrackets(tournamentId: number): Promise<PandascoreJson[]> {
    return await this.paginateAll(`/tournaments/${tournamentId}/brackets`);
  }

  async getTournamentMatches(tournamentId: number): Promise<PandascoreJson[]> {
    return await this.paginateAll(`/tournaments/${tournamentId}/matches`);
  }

  async getTournamentStandings(tournamentId: number): Promise<PandascoreJson[] | null> {
    try {
      return await this.paginateAll(`/tournaments/${tournamentId}/standings`);
    } catch (error) {
      if (!(error instanceof PandascoreApiError)) {
        throw error;
      }

      if (error.status === 404) {
        return [];
      }

      if (error.status !== 403) {
        throw error;
      }

      log.warn({
        component: PandascoreApiClient.name,
        message: "PandaScore standings are not available with this API plan",
        tournamentId,
      });

      return null;
    }
  }

  async getRocketLeaguePlayers(): Promise<PandascoreJson[]> {
    return await this.paginateAll(`/${VIDEOGAME}/players`, {
      params: { sort: "name" },
      rateLimitMs: 200,
    });
  }

  private async paginateAll(
    path: string,
    options: PandascoreRequestOptions = {},
  ): Promise<PandascoreJson[]> {
    const perPage = options.perPage ?? 100;
    const rateLimitMs = options.rateLimitMs ?? 100;

    const fetchFrom = async (page: number): Promise<PandascoreJson[]> => {
      const items = z.array(jsonSchema).parse(
        await this.request(path, {
          ...options,
          params: {
            ...options.params,
            page: String(page),
            per_page: String(perPage),
          },
        }),
      );

      if (items.length < perPage) {
        return items;
      }

      await sleep(rateLimitMs);

      return [...items, ...(await fetchFrom(page + 1))];
    };

    return await fetchFrom(1);
  }

  private async request(
    path: string,
    options: PandascoreRequestOptions = {},
  ): Promise<PandascoreJson> {
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

    return jsonSchema.parse(await response.json());
  }
}
