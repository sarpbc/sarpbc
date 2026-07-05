import type { Match } from "~/types/matches";
import {
  compressColumnIndices,
  computeLowerProgressionDepths,
  remapDepthsToColumnRange,
} from "./columns";
import { buildConnectors, finalizeSectionLayout, toLayoutMatch } from "./connectors";
import {
  getWinnerParentIds,
  getWinnerParentIdsFromLinks,
  hasUpperWinnerFeed,
  resolvePreviousMatchId,
} from "./graph";
import {
  getBracketSectionFromName,
  getCombinedColumnFromName,
  getUpperColumnFromName,
} from "./pandaScoreNames";
import { MIN_ROW_GAP, assignMatchRows, nextAvailableRow, sortMatchesByBeginAt } from "./rows";
import type { BracketLayoutMatch, BracketSectionLayout } from "./types";

const MAX_DOUBLE_ELIM_COMBINED_COLUMNS = 5;
const UPPER_TO_LOWER_ROW_GAP = 2;

/**
 * PandaScore double-elim split: upper bracket stays isolated; lower progression and
 * cross-bracket finals share the combined grid. Match names are used when PandaScore
 * omits feeder links (common for lower round 1).
 */
export function splitDoubleEliminationMatches(matches: Match[]): {
  upper: Match[];
  lower: Match[];
} {
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
    changed = false;

    for (const match of matches) {
      if (upperIds.has(match.id) || getBracketSectionFromName(match.name) === "upper") {
        continue;
      }

      const winnerParents = getWinnerParentIds(match, matchIds);
      if (winnerParents.some((parentId) => lowerIds.has(parentId))) {
        if (!lowerIds.has(match.id)) {
          lowerIds.add(match.id);
          upperIds.delete(match.id);
          changed = true;
        }
      }
    }

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

/**
 * Combined lower + finals grid: progression columns on the left, cross-bracket finals
 * on the right (up to 5 columns total, Liquipedia-like placement).
 */
export function buildDoubleEliminationCombinedLayout(
  lowerMatches: Match[],
  upperIds: Set<string>,
): BracketSectionLayout | null {
  if (lowerMatches.length === 0) {
    return null;
  }

  const namedColumns = new Map<string, number>();
  const unnamedMatches: Match[] = [];

  for (const match of lowerMatches) {
    const namedColumn = getCombinedColumnFromName(match.name);
    if (namedColumn === null) {
      unnamedMatches.push(match);
    } else {
      namedColumns.set(match.id, namedColumn);
    }
  }

  const crossBracketFinalIds = new Set(
    lowerMatches
      .filter(
        (match) =>
          getBracketSectionFromName(match.name) === "finals" || hasUpperWinnerFeed(match, upperIds),
      )
      .map((match) => match.id),
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

      unnamedFinals.forEach((match, index) => {
        columns.set(match.id, firstUnnamedColumn + progressionRoundCount + index);
      });
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
      unnamedFinals.forEach((match, index) => {
        columns.set(match.id, firstFinalColumn + index);
      });
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

/**
 * Single double-elim grid: lower/finals progression plus upper matches aligned above
 * the lower rounds they feed (Liquipedia-style placement).
 */
export function buildUnifiedDoubleEliminationLayout(
  upperMatches: Match[],
  lowerMatches: Match[],
  allMatches: Match[],
): BracketSectionLayout | null {
  if (upperMatches.length === 0 && lowerMatches.length === 0) {
    return null;
  }

  const upperIds = new Set(upperMatches.map((match) => match.id));
  const lowerSectionLayout = buildDoubleEliminationCombinedLayout(lowerMatches, upperIds);
  const lowerPositionById = new Map(
    (lowerSectionLayout?.matches ?? []).map((match) => [match.matchId, match]),
  );

  const upperPlacements: Array<{ match: Match; column: number; row: number }> = [];

  for (const upperMatch of sortMatchesByBeginAt(upperMatches)) {
    let anchorColumn: number | null = getUpperColumnFromName(upperMatch.name);
    let anchorRow: number | null = null;
    let foundLoserAnchor = false;

    for (const child of allMatches) {
      const childPosition = lowerPositionById.get(child.id);
      if (!childPosition) {
        continue;
      }

      for (const link of child.previousMatches ?? []) {
        if (resolvePreviousMatchId(link.previousMatch) !== upperMatch.id) {
          continue;
        }

        if (link.type === "loser") {
          anchorColumn = childPosition.column;
          anchorRow = childPosition.row;
          foundLoserAnchor = true;
          break;
        }

        if (anchorRow === null) {
          anchorColumn = childPosition.column;
          anchorRow = childPosition.row;
        }
      }

      if (foundLoserAnchor) {
        break;
      }
    }

    const column = anchorColumn ?? 0;
    const row = Math.max(0, (anchorRow ?? 0) - UPPER_TO_LOWER_ROW_GAP);
    upperPlacements.push({ match: upperMatch, column, row });
  }

  const takenUpperRows = new Map<number, number[]>();
  const sortedUpperPlacements = sortMatchesByBeginAt(
    upperPlacements.map((placement) => placement.match),
  ).map((match) => upperPlacements.find((placement) => placement.match.id === match.id)!);

  const upperLayoutMatches: BracketLayoutMatch[] = [];

  for (const placement of sortedUpperPlacements) {
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
