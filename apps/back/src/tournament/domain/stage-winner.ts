import type { DataSource } from "@sarpbc/types";

export interface StageOutcomeMatch {
  id: string;
  winnerId: string | null;
  previousMatchIds: string[];
}

export interface StageOutcome {
  source: DataSource;
  winnerId: string | null;
  matches: StageOutcomeMatch[];
  /** Participants whose team holds a first-place prize. */
  firstPlaceIds: string[];
}

/**
 * The winner of a stage PandaScore does not sync: the winner of its bracket final, the one match
 * fed by bracket links that feeds none, or else the single team awarded first place.
 */
export const deriveStageWinner = ({ matches, firstPlaceIds }: StageOutcome) => {
  const feeders = new Set(matches.flatMap(({ previousMatchIds }) => previousMatchIds));

  const finals = matches.filter(
    ({ id, previousMatchIds }) => previousMatchIds.length > 0 && !feeders.has(id),
  );

  const [final] = finals;

  if (finals.length === 1 && final?.winnerId !== null && final?.winnerId !== undefined) {
    return final.winnerId;
  }

  const [firstPlace] = firstPlaceIds;

  return firstPlaceIds.length === 1 && firstPlace !== undefined ? firstPlace : null;
};
