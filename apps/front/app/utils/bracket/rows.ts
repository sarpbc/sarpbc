import type { Match } from "~/types/matches";
import { getParentIds } from "./graph";

export const MIN_ROW_GAP = 2;

export function sortMatchesByBeginAt(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const dateA = a.beginAt ? new Date(a.beginAt).getTime() : Number.NaN;
    const dateB = b.beginAt ? new Date(b.beginAt).getTime() : Number.NaN;
    const hasDateA = !Number.isNaN(dateA);
    const hasDateB = !Number.isNaN(dateB);

    if (!hasDateA && !hasDateB) {
      return a.id.localeCompare(b.id);
    }
    if (!hasDateA) {
      return 1;
    }
    if (!hasDateB) {
      return -1;
    }
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    return a.id.localeCompare(b.id);
  });
}

function isRowTaken(row: number, takenRows: number[]): boolean {
  return takenRows.some((taken) => Math.abs(taken - row) < MIN_ROW_GAP);
}

export function nextAvailableRow(idealRow: number, takenRows: number[]): number {
  let row = idealRow;

  while (isRowTaken(row, takenRows)) {
    row += MIN_ROW_GAP;
  }

  return row;
}

export function assignMatchRows(
  matches: Match[],
  columns: Map<string, number>,
): Map<string, number> {
  const matchIds = new Set(matches.map((match) => match.id));
  const maxColumn = Math.max(0, ...columns.values());
  const rows = new Map<string, number>();
  const byColumn = new Map<number, Match[]>();

  for (const match of matches) {
    const column = columns.get(match.id) ?? 0;
    const columnMatches = byColumn.get(column) ?? [];
    columnMatches.push(match);
    byColumn.set(column, columnMatches);
  }

  const firstRound = sortMatchesByBeginAt(byColumn.get(0) ?? []);
  firstRound.forEach((match, index) => {
    rows.set(match.id, index * MIN_ROW_GAP);
  });

  for (let column = 1; column <= maxColumn; column++) {
    const columnMatches = sortMatchesByBeginAt(byColumn.get(column) ?? []);
    const takenRows: number[] = [];

    for (const match of columnMatches) {
      const parents = getParentIds(match, matchIds);
      const parentRows = parents
        .map((id) => rows.get(id))
        .filter((row): row is number => row !== undefined);

      let idealRow: number;
      if (parentRows.length > 0) {
        idealRow = parentRows.reduce((sum, row) => sum + row, 0) / parentRows.length;
      } else {
        const orphanMatches = columnMatches.filter(
          (candidate) => getParentIds(candidate, matchIds).length === 0,
        );
        const orphanIndex = orphanMatches.indexOf(match);
        const maxRow = Math.max(0, ...rows.values());
        idealRow = maxRow + MIN_ROW_GAP + orphanIndex * MIN_ROW_GAP;
      }

      const row = nextAvailableRow(idealRow, takenRows);
      rows.set(match.id, row);
      takenRows.push(row);
    }
  }

  return rows;
}
