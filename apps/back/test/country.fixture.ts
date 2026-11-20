import { vi } from "vitest";
import type { CountrySources } from "../src/country/application/country.service";
import { Player } from "../src/roster/domain/player";
import { Team } from "../src/roster/domain/team";
import type { Match } from "../src/tournament/domain/match";
import { careerMatch, kc } from "./career.fixture";

export const vitality = Object.assign(new Team(), {
  id: "vitality",
  name: "Team Vitality",
  slug: "team-vitality",
});

const countryPlayer = (id: string, name: string, team: Team | null) =>
  Object.assign(new Player(), { id, name, nationality: "fr", slug: id, team });

export const alpha54 = countryPlayer("alpha54", "Alpha54", vitality);
export const zen = countryPlayer("zen", "zen", vitality);
export const vatira = countryPlayer("vatira", "Vatira", kc);
export const exotiik = countryPlayer("exotiik", "ExoTiiK", null);
const french = [alpha54, exotiik, vatira, zen];

const countryMatches: Match[] = [careerMatch({ id: "final", sides: [[zen], [vatira]], winner: 0 })];

export const countrySources = () => {
  const matches: CountrySources["matches"] = {
    list: async (kind) => {
      const rows = kind === "results" ? countryMatches : [];

      return [rows, rows.length];
    },
  };

  const players: CountrySources["players"] = {
    findByNationality: async (code: string) => (code === "FR" ? french : []),
    nationalities: async () => [
      { code: "FR", players: 4 },
      { code: "US", players: 1 },
    ],
  };

  const list = vi.spyOn(matches, "list");
  const sources: CountrySources = { matches, players };

  return { list, sources };
};
