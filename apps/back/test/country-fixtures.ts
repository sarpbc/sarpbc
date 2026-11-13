import { vi } from "vitest";
import { isRedistributable } from "../src/common/domain/data-source";
import type { CountrySources } from "../src/country/application/country.service";
import { Player, Team } from "../src/roster/domain/roster";
import type {
  MatchListKind,
  MatchListQueryOptions,
} from "../src/tournament/application/match/match-list-filters";
import type { Match } from "../src/tournament/domain/competition";
import { careerMatch, kc } from "./career-fixtures";

export const vitality = Object.assign(new Team(), {
  id: "vitality",
  name: "Team Vitality",
  slug: "team-vitality",
});

function countryPlayer(id: string, name: string, team: Team | null): Player {
  return Object.assign(new Player(), { id, name, slug: id, nationality: "fr", team });
}

export const alpha54 = countryPlayer("alpha54", "Alpha54", vitality);
export const zen = countryPlayer("zen", "zen", vitality);
export const vatira = countryPlayer("vatira", "Vatira", kc);
export const exotiik = countryPlayer("exotiik", "ExoTiiK", null);
const french = [alpha54, exotiik, vatira, zen];

export const countryMatches: Match[] = [
  careerMatch({ id: "final", sides: [[zen], [vatira]], winner: 0 }),
  careerMatch({ id: "startgg-match", sides: [[zen], [vatira]], winner: 0, source: "startgg" }),
  careerMatch({
    id: "startgg-stage",
    sides: [[vatira], [zen]],
    winner: 1,
    tournamentSource: "startgg",
  }),
];

function redistributable(match: Match): boolean {
  return isRedistributable(match.source) && isRedistributable(match.tournament.source);
}

export function countrySources() {
  const findByNationality = vi.fn(async (code: string) => (code === "FR" ? french : []));
  const list = vi.fn(
    async (
      kind: MatchListKind,
      options: MatchListQueryOptions = {},
    ): Promise<[Match[], number]> => {
      const rows = countryMatches.filter(
        (match) => kind === "results" && (!options.redistributableOnly || redistributable(match)),
      );
      return [rows, rows.length];
    },
  );
  const sources: CountrySources = {
    players: {
      nationalities: async () => [
        { code: "FR", players: 4 },
        { code: "US", players: 1 },
      ],
      findByNationality,
    },
    matches: { list },
  };
  return { sources, findByNationality, list };
}
