import {
  EMPTY_BRACKET_SIZES,
  type BracketLinkInput,
  type BracketLinkType,
  type DataSource,
  type EmptyBracketSize,
} from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors";

export interface BracketMatch {
  id: string;
  previousMatches: BracketLinkInput[];
}

export interface StageBracket {
  hasBracket: boolean;
  matches: BracketMatch[];
}

export const MAX_INCOMING_BRACKET_LINKS = 2;

export function assertManualBracketMatch(match: {
  source: DataSource;
  pandascoreId: number | null;
  tournament: { source: DataSource };
}): void {
  if (
    match.source === "pandascore" ||
    match.pandascoreId !== null ||
    match.tournament.source === "pandascore"
  )
    throw new InvalidInputError(
      "PandaScore manages the participants and bracket links of this match.",
    );
}

export function assertBracketLinks(
  matchId: string,
  links: readonly BracketLinkInput[],
  stage: StageBracket,
): void {
  if (links.length === 0) return;

  if (!stage.hasBracket)
    throw new InvalidInputError(
      "Enable the bracket on this stage before linking its matches (hasBracket).",
    );

  if (links.length > MAX_INCOMING_BRACKET_LINKS)
    throw new InvalidInputError(
      `A match can be fed by at most ${MAX_INCOMING_BRACKET_LINKS} previous matches.`,
    );
  const previousIds = links.map((link) => link.previousMatchId);

  if (new Set(previousIds).size !== previousIds.length)
    throw new InvalidInputError("Each previous match can only be linked once.");

  if (previousIds.includes(matchId)) throw new InvalidInputError("A match cannot feed itself.");
  const byId = new Map(stage.matches.map((match) => [match.id, match]));
  const outsider = previousIds.find((id) => !byId.has(id));

  if (outsider)
    throw new InvalidInputError(
      `Previous match "${outsider}" is not a match of this stage. Link matches of the same stage only.`,
    );

  for (const link of links) {
    const taken = stage.matches.find(
      (match) =>
        match.id !== matchId &&
        match.previousMatches.some(
          (other) => other.previousMatchId === link.previousMatchId && other.type === link.type,
        ),
    );

    if (taken)
      throw new InvalidInputError(
        `The ${link.type} of match "${link.previousMatchId}" already goes to match "${taken.id}".`,
      );
  }

  if (previousIds.some((id) => feeds(matchId, id, byId)))
    throw new InvalidInputError("These links would create a cycle in the bracket.");
}

function feeds(ancestorId: string, id: string, byId: ReadonlyMap<string, BracketMatch>): boolean {
  const seen = new Set<string>();
  const pending = [id];

  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    if (current === ancestorId) return true;

    if (seen.has(current)) continue;
    seen.add(current);

    for (const link of byId.get(current)?.previousMatches ?? []) pending.push(link.previousMatchId);
  }

  return false;
}

export interface EmptyBracketMatch {
  name: string;
  previousMatches: { index: number; type: BracketLinkType }[];
}

export function isEmptyBracketSize(teams: number): teams is EmptyBracketSize {
  return EMPTY_BRACKET_SIZES.some((size) => size === teams);
}

export function emptySingleEliminationBracket(teams: EmptyBracketSize): EmptyBracketMatch[] {
  const matches: EmptyBracketMatch[] = [];
  let previousRound: number[] = [];

  for (let size: number = teams; size >= 2; size /= 2) {
    const round: number[] = [];

    for (let slot = 0; slot < size / 2; slot++) {
      round.push(matches.length);
      const feeders = previousRound.slice(slot * 2, slot * 2 + 2);
      matches.push({
        name: size === 2 ? "Grand Final" : `${roundName(size)} ${slot + 1}`,
        previousMatches: feeders.map((index) => ({ index, type: "winner" })),
      });
    }

    previousRound = round;
  }

  return matches;
}

function roundName(size: number): string {
  switch (size) {
    case 4:
      return "Semifinal";
    case 8:
      return "Quarterfinal";
    default:
      return `Round of ${size}`;
  }
}
