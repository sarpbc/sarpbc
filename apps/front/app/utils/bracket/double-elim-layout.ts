import type { TournamentDetailMatch } from "@sarpbc/types";
import {
  compressColumnIndices,
  computeLowerProgressionDepths,
  remapDepthsToColumnRange,
} from "./columns";
import { buildConnectors, finalizeSectionLayout, toLayoutMatch } from "./connectors";
import { getWinnerParentIds, getWinnerParentIdsFromLinks, hasUpperWinnerFeed } from "./graph";
import {
  getBracketSectionFromName,
  getCombinedColumnFromName,
  getUpperColumnFromName,
} from "./panda-score-names";
import { MIN_ROW_GAP, assignMatchRows, nextAvailableRow, sortMatchesByBeginAt } from "./rows";
import type { BracketLayoutMatch, BracketSectionLayout } from "./types";

const MAX_DOUBLE_ELIM_COMBINED_COLUMNS = 5;
const UPPER_TO_LOWER_ROW_GAP = 2;

export interface DoubleEliminationSplit {
  upper: TournamentDetailMatch[];
  lower: TournamentDetailMatch[];
}

function propagateLowerFromWinnerParents(
  matches: TournamentDetailMatch[],
  matchIds: Set<string>,
  lowerIds: Set<string>,
  upperIds: Set<string>,
): boolean {
  let changed = false;

  for (const match of matches) {
    if (upperIds.has(match.id) || getBracketSectionFromName(match.name) === "upper") {
      continue;
    }

    const winnerParents = getWinnerParentIds(match, matchIds);

    if (winnerParents.some((parentId) => lowerIds.has(parentId)) && !lowerIds.has(match.id)) {
      lowerIds.add(match.id);
      upperIds.delete(match.id);
      changed = true;
    }
  }

  return changed;
}

function propagateLowerFromLinks(
  matches: TournamentDetailMatch[],
  matchIds: Set<string>,
  matchById: Map<string, TournamentDetailMatch>,
  lowerIds: Set<string>,
  upperIds: Set<string>,
): boolean {
  let changed = false;

  for (const match of matches) {
    if (lowerIds.has(match.id) || upperIds.has(match.id)) {
      continue;
    }

    for (const parentId of getWinnerParentIdsFromLinks(match)) {
      if (!lowerIds.has(parentId) || !matchIds.has(parentId)) {
        continue;
      }

      const parent = matchById.get(parentId);

      if (getBracketSectionFromName(parent?.name) === "upper") {
        continue;
      }

      if (!lowerIds.has(match.id)) {
        lowerIds.add(match.id);
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * PandaScore double-elim split: upper bracket stays isolated; lower progression and
 * cross-bracket finals share the combined grid. Match names are used when PandaScore
 * omits feeder links (common for lower round 1).
 */
export function splitDoubleEliminationMatches(
  matches: TournamentDetailMatch[],
): DoubleEliminationSplit {
  const matchIds = new Set(matches.map((match) => match.id));
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const lowerIds = new Set<string>();
  const upperIds = new Set<string>();

  for (const match of matches) {
    const section = getBracketSectionFromName(match.name);

    if (section === "upper") {
      upperIds.add(match.id);
    } else if (section === "lower" || section === "finals") {
      lowerIds.add(match.id);
    }
  }

  for (const match of matches) {
    const hasLoserFeed = match.previousMatches?.some((link) => link.type === "loser");

    if (hasLoserFeed) {
      lowerIds.add(match.id);
      upperIds.delete(match.id);
    }
  }

  let changed = true;

  while (changed) {
    const fedByWinners = propagateLowerFromWinnerParents(matches, matchIds, lowerIds, upperIds);
    const fedByLinks = propagateLowerFromLinks(matches, matchIds, matchById, lowerIds, upperIds);
    changed = fedByWinners || fedByLinks;
  }

  for (const match of matches) {
    if (getBracketSectionFromName(match.name) === "upper") {
      lowerIds.delete(match.id);
    }
  }

  const lower = sortMatchesByBeginAt(matches.filter((match) => lowerIds.has(match.id)));
  const upper = sortMatchesByBeginAt(matches.filter((match) => !lowerIds.has(match.id)));

  return { upper, lower };
}

export function buildDoubleEliminationCombinedLayout(
  lowerMatches: TournamentDetailMatch[],
  upperIds: Set<string>,
): BracketSectionLayout | null {
  if (lowerMatches.length === 0) {
    return null;
  }

  const namedColumns = new Map<string, number>();
  const unnamedMatches: TournamentDetailMatch[] = [];

  for (const match of lowerMatches) {
    const namedColumn = getCombinedColumnFromName(match.name);

    if (namedColumn === null) {
      unnamedMatches.push(match);
    } else {
      namedColumns.set(match.id, namedColumn);
    }
  }

  const crossBracketFinalIds = new Set(
    lowerMatches.flatMap((match) =>
      getBracketSectionFromName(match.name) === "finals" || hasUpperWinnerFeed(match, upperIds)
        ? [match.id]
        : [],
    ),
  );

  const columns = new Map<string, number>(namedColumns);

  if (unnamedMatches.length > 0) {
    const progressionDepths = computeLowerProgressionDepths(unnamedMatches, crossBracketFinalIds);

    const unnamedFinals = sortMatchesByBeginAt(
      unnamedMatches.filter((match) => crossBracketFinalIds.has(match.id)),
    );

    const maxNamedColumn = namedColumns.size > 0 ? Math.max(...namedColumns.values()) : -1;
    const finalColumnCount = unnamedFinals.length > 0 ? Math.min(unnamedFinals.length, 2) : 0;

    const maxProgressionDepth = progressionDepths.size
      ? Math.max(...progressionDepths.values())
      : 0;

    const progressionRoundCount = maxProgressionDepth + 1;
    const firstUnnamedColumn = maxNamedColumn + 1;
    const totalNeededColumns = firstUnnamedColumn + progressionRoundCount + finalColumnCount;

    if (totalNeededColumns <= MAX_DOUBLE_ELIM_COMBINED_COLUMNS) {
      for (const [matchId, depth] of progressionDepths) {
        columns.set(matchId, firstUnnamedColumn + depth);
      }

      for (const [index, match] of unnamedFinals.entries()) {
        columns.set(match.id, firstUnnamedColumn + progressionRoundCount + index);
      }
    } else {
      const progressionTargetMax = Math.max(
        0,
        MAX_DOUBLE_ELIM_COMBINED_COLUMNS - finalColumnCount - firstUnnamedColumn - 1,
      );

      const remappedProgression = remapDepthsToColumnRange(progressionDepths, progressionTargetMax);

      for (const [matchId, depth] of remappedProgression) {
        columns.set(matchId, firstUnnamedColumn + depth);
      }

      const firstFinalColumn = MAX_DOUBLE_ELIM_COMBINED_COLUMNS - finalColumnCount;

      for (const [index, match] of unnamedFinals.entries()) {
        columns.set(match.id, firstFinalColumn + index);
      }
    }
  }

  for (const match of lowerMatches) {
    if (columns.has(match.id)) {
      continue;
    }

    columns.set(match.id, 0);
  }

  const compressedColumns = compressColumnIndices(columns);
  const rows = assignMatchRows(lowerMatches, compressedColumns);
  const maxColumn = Math.max(...compressedColumns.values(), 0);

  const layoutMatches = lowerMatches.map((match) =>
    toLayoutMatch(match, compressedColumns.get(match.id) ?? 0, rows.get(match.id) ?? 0, "lower"),
  );

  return finalizeSectionLayout(lowerMatches, layoutMatches, maxColumn);
}

interface UpperAnchor {
  column: number | null;
  row: number | null;
}

function findUpperAnchor(
  upperMatch: TournamentDetailMatch,
  allMatches: TournamentDetailMatch[],
  lowerPositionById: Map<string, BracketLayoutMatch>,
): UpperAnchor {
  let column: number | null = getUpperColumnFromName(upperMatch.name);
  let row: number | null = null;

  for (const child of allMatches) {
    const childPosition = lowerPositionById.get(child.id);

    if (!childPosition) {
      continue;
    }

    for (const link of child.previousMatches ?? []) {
      if (link.previousMatch !== upperMatch.id) {
        continue;
      }

      if (link.type === "loser") {
        return { column: childPosition.column, row: childPosition.row };
      }

      if (row === null) {
        ({ column, row } = childPosition);
      }
    }
  }

  return { column, row };
}

export function buildUnifiedDoubleEliminationLayout(
  upperMatches: TournamentDetailMatch[],
  lowerMatches: TournamentDetailMatch[],
  allMatches: TournamentDetailMatch[],
): BracketSectionLayout | null {
  if (upperMatches.length === 0 && lowerMatches.length === 0) {
    return null;
  }

  const upperIds = new Set(upperMatches.map((match) => match.id));
  const lowerSectionLayout = buildDoubleEliminationCombinedLayout(lowerMatches, upperIds);

  const lowerPositionById = new Map(
    (lowerSectionLayout?.matches ?? []).map((match) => [match.matchId, match]),
  );

  const upperPlacements: { match: TournamentDetailMatch; column: number; row: number }[] = [];

  for (const upperMatch of sortMatchesByBeginAt(upperMatches)) {
    const { column: anchorColumn, row: anchorRow } = findUpperAnchor(
      upperMatch,
      allMatches,
      lowerPositionById,
    );

    const column = anchorColumn ?? 0;
    const row = Math.max(0, (anchorRow ?? 0) - UPPER_TO_LOWER_ROW_GAP);
    upperPlacements.push({ match: upperMatch, column, row });
  }

  const takenUpperRows = new Map<number, number[]>();

  const upperLayoutMatches: BracketLayoutMatch[] = [];

  for (const placement of upperPlacements) {
    const takenRows = takenUpperRows.get(placement.column) ?? [];
    const row = nextAvailableRow(placement.row, takenRows);
    takenRows.push(row);
    takenUpperRows.set(placement.column, takenRows);
    upperLayoutMatches.push({
      ...toLayoutMatch(placement.match, placement.column, row, "upper"),
    });
  }

  const upperBand =
    upperLayoutMatches.length > 0
      ? Math.max(...upperLayoutMatches.map((match) => match.row)) + MIN_ROW_GAP
      : 0;

  const layoutMatches: BracketLayoutMatch[] = [
    ...upperLayoutMatches,
    ...(lowerSectionLayout?.matches ?? []).map((lowerMatch) => ({
      ...lowerMatch,
      row: lowerMatch.row + upperBand,
      zone: "lower" as const,
    })),
  ];

  const gridMatches = [...upperMatches, ...lowerMatches];
  const gridMatchIds = new Set(gridMatches.map((match) => match.id));
  const maxColumn = Math.max(...layoutMatches.map((match) => match.column), 0);
  const maxRow = Math.max(...layoutMatches.map((match) => match.row), 0);

  return {
    matches: layoutMatches,
    connectors: buildConnectors(gridMatches, gridMatchIds),
    columnCount: maxColumn + 1,
    rowCount: maxRow + 2,
  };
}
