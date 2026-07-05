import type { Match } from "~/types/matches";
import { getParentIds } from "./graph";

function getMatchBeginAtTime(match: Match): number | null {
  if (!match.beginAt) {
    return null;
  }

  const time = new Date(match.beginAt).getTime();
  return Number.isNaN(time) ? null : time;
}

function getMatchDayKey(match: Match): string | null {
  if (!match.beginAt) {
    return null;
  }

  const date = new Date(match.beginAt);
  return Number.isNaN(date.getTime()) ? null : date.toDateString();
}

export function compressColumnIndices(columns: Map<string, number>): Map<string, number> {
  const usedColumns = [...new Set(columns.values())].sort((a, b) => a - b);
  const columnRemap = new Map(usedColumns.map((column, index) => [column, index]));
  const compressed = new Map<string, number>();

  for (const [matchId, column] of columns) {
    compressed.set(matchId, columnRemap.get(column) ?? column);
  }

  return compressed;
}

/**
 * Columns follow match calendar order (beginAt day buckets), then are pushed right
 * so a match never appears before any of its feeder matches.
 */
export function computeChronologicalColumns(matches: Match[]): Map<string, number> {
  const matchIds = new Set(matches.map((match) => match.id));
  const columns = new Map<string, number>();
  const dayOrder = new Map<string, number>();
  let nextDayIndex = 0;

  const sortedByBeginAt = [...matches].sort((a, b) => {
    const timeA = getMatchBeginAtTime(a);
    const timeB = getMatchBeginAtTime(b);

    if (timeA === null && timeB === null) {
      return a.id.localeCompare(b.id);
    }
    if (timeA === null) {
      return 1;
    }
    if (timeB === null) {
      return -1;
    }
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return a.id.localeCompare(b.id);
  });

  const initialColumns = new Map<string, number>();

  for (const match of sortedByBeginAt) {
    const dayKey = getMatchDayKey(match);
    if (dayKey === null) {
      continue;
    }

    if (!dayOrder.has(dayKey)) {
      dayOrder.set(dayKey, nextDayIndex++);
    }

    initialColumns.set(match.id, dayOrder.get(dayKey)!);
  }

  for (const match of matches) {
    if (initialColumns.has(match.id)) {
      columns.set(match.id, initialColumns.get(match.id)!);
    }
  }

  let changed = true;
  let iterations = 0;

  while (changed && iterations < matches.length + 1) {
    changed = false;
    iterations++;

    for (const match of matches) {
      const parents = getParentIds(match, matchIds);
      let nextColumn = initialColumns.get(match.id) ?? 0;

      if (parents.length > 0) {
        const parentColumns = parents
          .map((id) => columns.get(id))
          .filter((column): column is number => column !== undefined);

        if (parentColumns.length !== parents.length) {
          continue;
        }

        nextColumn = Math.max(nextColumn, Math.max(...parentColumns) + 1);
      }

      if (columns.get(match.id) !== nextColumn) {
        columns.set(match.id, nextColumn);
        changed = true;
      }
    }
  }

  for (const match of matches) {
    if (columns.has(match.id)) {
      continue;
    }

    const parents = getParentIds(match, matchIds);
    if (parents.length === 0) {
      columns.set(match.id, 0);
      continue;
    }

    const parentColumns = parents
      .map((id) => columns.get(id))
      .filter((column): column is number => column !== undefined);

    columns.set(match.id, parentColumns.length > 0 ? Math.max(...parentColumns) + 1 : 0);
  }

  return compressColumnIndices(columns);
}

export function computeLowerProgressionDepths(
  matches: Match[],
  crossBracketFinalIds: Set<string>,
): Map<string, number> {
  const matchIds = new Set(matches.map((match) => match.id));
  const depths = new Map<string, number>();
  const progressionMatches = matches.filter((match) => !crossBracketFinalIds.has(match.id));

  for (const match of progressionMatches) {
    const parentsInSection = getParentIds(match, matchIds).filter(
      (parentId) => !crossBracketFinalIds.has(parentId),
    );
    if (parentsInSection.length === 0) {
      depths.set(match.id, 0);
    }
  }

  let changed = true;
  let iterations = 0;

  while (changed && iterations < progressionMatches.length + 1) {
    changed = false;
    iterations++;

    for (const match of progressionMatches) {
      const parentsInSection = getParentIds(match, matchIds).filter(
        (parentId) => !crossBracketFinalIds.has(parentId),
      );
      if (parentsInSection.length === 0) {
        continue;
      }

      const parentDepths = parentsInSection
        .map((parentId) => depths.get(parentId))
        .filter((depth): depth is number => depth !== undefined);

      if (parentDepths.length !== parentsInSection.length) {
        continue;
      }

      const nextDepth = Math.max(...parentDepths) + 1;
      if (depths.get(match.id) !== nextDepth) {
        depths.set(match.id, nextDepth);
        changed = true;
      }
    }
  }

  for (const match of progressionMatches) {
    if (!depths.has(match.id)) {
      depths.set(match.id, 0);
    }
  }

  return depths;
}

export function remapDepthsToColumnRange(
  depths: Map<string, number>,
  targetMaxColumn: number,
): Map<string, number> {
  if (depths.size === 0) {
    return new Map();
  }

  const usedDepths = [...new Set(depths.values())].sort((a, b) => a - b);
  const depthRemap = new Map(
    usedDepths.map((depth, index) => {
      if (usedDepths.length === 1) {
        return [depth, 0] as const;
      }

      const ratio = index / (usedDepths.length - 1);
      return [depth, Math.round(ratio * targetMaxColumn)] as const;
    }),
  );

  const remapped = new Map<string, number>();
  for (const [matchId, depth] of depths) {
    remapped.set(matchId, depthRemap.get(depth) ?? 0);
  }

  return remapped;
}
