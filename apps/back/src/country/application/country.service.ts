import { countryCode } from "@sarpbc/utils";
import type { NationalityCount } from "../../roster/application/ports";
import type { PlayerService } from "../../roster/application/player.service";
import type { Player } from "../../roster/domain/player";
import type { Team } from "../../roster/domain/team";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { MatchService } from "../../tournament/application/match/match.service";
import type { Match } from "../../tournament/domain/match";

export interface CountrySources {
  players: Pick<PlayerService, "nationalities" | "findByNationality">;
  matches: Pick<MatchService, "list">;
}

export interface CountryPage {
  code: string;
  players: Player[];
  teams: Team[];
  matches: Match[];
  matchTotal: number;
}

export interface CountryMatchPage {
  limit: number;
  offset: number;
}

function currentTeams(players: Player[]): Team[] {
  const teams = new Map<string, Team>();

  for (const { team } of players) if (team) teams.set(team.id, team);

  return [...teams.values()].toSorted((a, b) => a.name.localeCompare(b.name, "en"));
}

export class CountryService {
  constructor(private readonly sources: CountrySources) {}

  async list(): Promise<NationalityCount[]> {
    return await this.sources.players.nationalities();
  }

  async detail(rawCode: string, page: CountryMatchPage): Promise<CountryPage> {
    const code = countryCode(rawCode);

    const players =
      code !== null && code !== "" ? await this.sources.players.findByNationality(code) : [];

    if (code === null || code === "" || players.length === 0) {
      throw new NotFoundError(`No player has the nationality "${rawCode}"`);
    }

    const [matches, matchTotal] = await this.sources.matches.list("results", {
      ...page,
      playerIds: players.map(({ id }) => id),
      redistributableOnly: true,
    });

    return { code, players, teams: currentTeams(players), matches, matchTotal };
  }
}
