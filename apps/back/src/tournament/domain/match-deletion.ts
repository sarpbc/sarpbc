import { ConflictError, InvalidInputError } from "../../common/domain/errors";
import { describeReferences, type ReferenceNouns } from "../../common/domain/references";
import type { Match } from "./competition";

export interface MatchReferences {
  picks: number;
  comments: number;
  nextMatches: number;
}

const MATCH_REFERENCE_NOUNS: ReferenceNouns<keyof MatchReferences> = {
  picks: ["pick'em pick", "pick'em picks"],
  comments: ["comment", "comments"],
  nextMatches: ["bracket match fed by it", "bracket matches fed by it"],
};

export function assertMatchDeletable(match: Match, references: MatchReferences): void {
  if (match.source === "pandascore" || match.pandascoreId !== null) {
    throw new InvalidInputError(
      `${match.name} is synced from PandaScore and would be imported again; it cannot be deleted`,
    );
  }

  const blocking = describeReferences(references, MATCH_REFERENCE_NOUNS);

  if (blocking !== null && blocking !== "") {
    throw new ConflictError(`${match.name} still has ${blocking}; remove them before deleting it`);
  }
}
