import type { TeamAliasInput } from "@sarpbc/types";
import {
  TEAM_ALIAS_NAME_MAX_LENGTH,
  isoDay,
  parseTeamAlias,
  teamAliasInForce,
  teamAliasesOverlap,
} from "@sarpbc/utils";
import type { TeamAliasError } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import { Team } from "./team";

export class TeamAlias {
  id = "";
  name = "";
  from = "";
  to: string | null = null;
  sourceUrl = "";
  logoUrl: string | null = null;
  pandascoreId: number | null = null;
}

const ERRORS = {
  "forbidden-logo-source": "Liquipedia is not an accepted logo source; use the official asset.",
  "forbidden-source":
    "Liquipedia, BLAST.tv and start.gg are not accepted sources; cite the team, its players, the organiser, RLEsports or PandaScore.",
  "invalid-from": "The alias start date must be a real YYYY-MM-DD date.",
  "invalid-logo-url": "The alias logo must be an https URL.",
  "invalid-pandascore-id": "The PandaScore team id must be a positive whole number.",
  "invalid-source-url": "The alias source must be an http(s) URL.",
  "invalid-to": "The alias end date must be a real YYYY-MM-DD date.",
  "missing-name": "A team alias needs a name.",
  "name-too-long": `The alias name is over ${TEAM_ALIAS_NAME_MAX_LENGTH} characters.`,
  "to-not-after-from": "The alias end date must come after its start date.",
} satisfies Record<TeamAliasError, string>;

export const requireTeamAliasInput = (input: TeamAliasInput) => {
  const parsed = parseTeamAlias(input);

  if (!parsed.ok) {
    throw new InvalidInputError(ERRORS[parsed.error]);
  }

  return parsed.alias satisfies TeamAliasInput;
};

export const assertTeamAliasFits = (alias: TeamAlias, team: Team) => {
  const overlap = team.aliases.find(
    (other) => other.id !== alias.id && teamAliasesOverlap(alias, other),
  );

  if (overlap) {
    throw new UnprocessableError(
      `This period overlaps the alias "${overlap.name}" of ${team.name} (${overlap.from} to ${overlap.to ?? "now"}); update that alias instead.`,
    );
  }

  if (alias.pandascoreId !== null && alias.pandascoreId === team.pandascoreId) {
    throw new InvalidInputError(
      `${team.name} already has PandaScore id ${alias.pandascoreId}; leave it off the alias.`,
    );
  }
};

export const teamAt = (team: Team, at: Date | null) => {
  if (!at || team.aliases.length === 0) {
    return team;
  }

  const alias = teamAliasInForce(team.aliases, isoDay(at));

  if (!alias) {
    return team;
  }

  const logo =
    alias.logoUrl !== null && alias.logoUrl !== ""
      ? {
          darkModeImageUrl: null,
          imageUrl: alias.logoUrl,
          logoDarkUrl: null,
          logoLightUrl: alias.logoUrl,
        }
      : {};

  return Object.assign(new Team(), team, { name: alias.name }, logo);
};
