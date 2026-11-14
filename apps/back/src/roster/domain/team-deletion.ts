import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { describeReferences } from "../../common/domain/references";
import type { ReferenceNouns } from "../../common/domain/references";
import type { Team } from "./team";

export interface TeamCompetitionReferences {
  participations: number;
  matches: number;
  prizes: number;
}

export interface TeamReferences extends TeamCompetitionReferences {
  players: number;
  contracts: number;
  redirects: number;
}

const TEAM_REFERENCE_NOUNS: ReferenceNouns<keyof TeamReferences> = {
  players: ["current player", "current players"],
  contracts: ["contract", "contracts"],
  redirects: ["merged duplicate", "merged duplicates"],
  participations: ["tournament participation", "tournament participations"],
  matches: ["match", "matches"],
  prizes: ["prize", "prizes"],
};

export function assertTeamDeletable(team: Team, references: TeamReferences): void {
  if (team.mergedIntoId !== null && team.mergedIntoId !== "") {
    throw new InvalidInputError(
      `${team.name} was merged into team "${team.mergedIntoId}" and is kept as its redirect`,
    );
  }

  if (team.source === "pandascore" || team.pandascoreId !== null) {
    throw new InvalidInputError(
      `${team.name} is synced from PandaScore and cannot be deleted; merge it instead`,
    );
  }

  const blocking = describeReferences(references, TEAM_REFERENCE_NOUNS);

  if (blocking !== null && blocking !== "") {
    throw new ConflictError(
      `${team.name} still has ${blocking}. Merge it into the team it duplicates instead of deleting it.`,
    );
  }
}
