import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { BracketLink, DrawnBracketMatch, Tournament } from "~/types/tournament";
import type { Team } from "~/types/team";

export const BRACKET_MATCH_WIDTH = 176;
export const BRACKET_MATCH_HEIGHT = 52;
export const BRACKET_COLUMN_GAP = 20;
export const BRACKET_ROW_UNIT = 28;

export type TournamentBracketFormat =
  | "flat-stage"
  | "linked-single-elimination"
  | "linked-double-elimination"
  | "bracket-missing-links";

export interface TournamentBracketRoundGroup {
  round: string;
  matches: Match[];
}

export interface BracketLayoutMatch {
  matchId: string;
  column: number;
  row: number;
  name?: string;
  teamA?: Team;
  teamB?: Team;
  participantAId?: string;
  participantBId?: string;
  results?: DrawnBracketMatch["results"];
  winnerParticipantId: string | null;
}

export interface BracketConnector {
  fromMatchId: string;
  toMatchId: string;
  linkType: "winner" | "loser";
  targetSlot: "a" | "b";
}

export interface BracketSectionLayout {
  matches: BracketLayoutMatch[];
  connectors: BracketConnector[];
  columnCount: number;
  rowCount: number;
}

export interface TournamentBracketView {
  format: TournamentBracketFormat;
  upperLayout: BracketSectionLayout | null;
  lowerLayout: BracketSectionLayout | null;
  lowerBracketFlatMatches: Match[];
  flatMatches: Match[];
  groupedMatches: TournamentBracketRoundGroup[];
}

interface BracketTreeNode {
  matchId: string;
  teamA?: DrawnBracketMatch["teamA"];
  teamB?: DrawnBracketMatch["teamB"];
  participantAId?: string;
  participantBId?: string;
  results?: DrawnBracketMatch["results"];
  previousMatchA?: { id: string; type: "winner" };
  previousMatchB?: { id: string; type: "winner" };
}

export function resolvePreviousMatchId(previousMatch: BracketLink["previousMatch"]): string {
  return typeof previousMatch === "string" ? previousMatch : previousMatch.id;
}

export function getMatchWinnerParticipantId(match: Match): string | null {
  if (match.winner?.id) {
    return match.winner.id;
  }

  const participantAId = match.participants?.[0]?.id;
  const participantBId = match.participants?.[1]?.id;
  const scoreA = getMatchParticipantScore(match.results, participantAId);
  const scoreB = getMatchParticipantScore(match.results, participantBId);

  if (scoreA === null || scoreB === null) {
    return null;
  }

  if (scoreA > scoreB) {
    return participantAId ?? null;
  }

  if (scoreB > scoreA) {
    return participantBId ?? null;
  }

  return null;
}

function getParentIds(match: Match, matchIds: Set<string>): string[] {
  return (match.previousMatches ?? [])
    .map((link) => resolvePreviousMatchId(link.previousMatch))
    .filter((id) => matchIds.has(id));
}

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

function compressColumnIndices(columns: Map<string, number>): Map<string, number> {
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
function computeChronologicalColumns(matches: Match[]): Map<string, number> {
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

const MIN_ROW_GAP = 2;

function isRowTaken(row: number, takenRows: number[]): boolean {
  return takenRows.some((taken) => Math.abs(taken - row) < MIN_ROW_GAP);
}

function nextAvailableRow(idealRow: number, takenRows: number[]): number {
  let row = idealRow;

  while (isRowTaken(row, takenRows)) {
    row += MIN_ROW_GAP;
  }

  return row;
}

function assignMatchRows(matches: Match[], columns: Map<string, number>): Map<string, number> {
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

function buildConnectors(matches: Match[], matchIds: Set<string>): BracketConnector[] {
  const connectors: BracketConnector[] = [];

  for (const match of matches) {
    const links = (match.previousMatches ?? []).filter((link) =>
      matchIds.has(resolvePreviousMatchId(link.previousMatch)),
    );

    links.forEach((link, index) => {
      connectors.push({
        fromMatchId: resolvePreviousMatchId(link.previousMatch),
        toMatchId: match.id,
        linkType: link.type,
        targetSlot: index === 0 ? "a" : "b",
      });
    });
  }

  return connectors;
}

function toLayoutMatch(match: Match, column: number, row: number): BracketLayoutMatch {
  return {
    matchId: match.id,
    column,
    row,
    name: match.name,
    teamA: match.participants?.[0]?.team,
    teamB: match.participants?.[1]?.team,
    participantAId: match.participants?.[0]?.id,
    participantBId: match.participants?.[1]?.id,
    results: match.results,
    winnerParticipantId: getMatchWinnerParticipantId(match),
  };
}

export function buildBracketSectionLayout(matches: Match[]): BracketSectionLayout | null {
  if (matches.length === 0) {
    return null;
  }

  const columns = computeChronologicalColumns(matches);
  const rows = assignMatchRows(matches, columns);
  const maxColumn = Math.max(...columns.values());
  const matchIds = new Set(matches.map((match) => match.id));

  const layoutMatches = matches.map((match) =>
    toLayoutMatch(match, columns.get(match.id) ?? 0, rows.get(match.id) ?? 0),
  );

  const maxRow = Math.max(...layoutMatches.map((match) => match.row), 0);

  return {
    matches: layoutMatches,
    connectors: buildConnectors(matches, matchIds),
    columnCount: maxColumn + 1,
    rowCount: maxRow + 2,
  };
}

function toDrawnBracketMatch(match: Match): DrawnBracketMatch {
  return {
    matchId: match.id,
    teamA: match.participants?.[0]?.team,
    teamB: match.participants?.[1]?.team,
    participantAId: match.participants?.[0]?.id,
    participantBId: match.participants?.[1]?.id,
    results: match.results,
  };
}

function toBracketTreeNode(match: Match): BracketTreeNode {
  const winnerLinks = (match.previousMatches ?? []).filter((link) => link.type === "winner");

  return {
    ...toDrawnBracketMatch(match),
    previousMatchA: winnerLinks[0]
      ? { id: resolvePreviousMatchId(winnerLinks[0].previousMatch), type: "winner" }
      : undefined,
    previousMatchB: winnerLinks[1]
      ? { id: resolvePreviousMatchId(winnerLinks[1].previousMatch), type: "winner" }
      : undefined,
  };
}

export function classifyTournamentBracket(tournament: Tournament): TournamentBracketFormat {
  const matches = tournament.matches ?? [];
  if (matches.length === 0) {
    return "flat-stage";
  }

  const hasLoserLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "loser"),
  );
  if (hasLoserLinks) {
    return "linked-double-elimination";
  }

  const hasWinnerLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "winner"),
  );
  if (hasWinnerLinks) {
    return "linked-single-elimination";
  }

  if (tournament.hasBracket) {
    return "bracket-missing-links";
  }

  return "flat-stage";
}

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

export function groupMatchesByRound(matches: Match[]): TournamentBracketRoundGroup[] {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const round = match.name?.trim() || "TBD";
    const roundMatches = groups.get(round) ?? [];
    roundMatches.push(match);
    groups.set(round, roundMatches);
  }

  return [...groups.entries()]
    .map(([round, roundMatches]) => ({
      round,
      matches: sortMatchesByBeginAt(roundMatches),
    }))
    .sort((a, b) => {
      const dateA = a.matches[0]?.beginAt ? new Date(a.matches[0].beginAt).getTime() : 0;
      const dateB = b.matches[0]?.beginAt ? new Date(b.matches[0].beginAt).getTime() : 0;
      return dateA - dateB;
    });
}

/**
 * PandaScore double-elim split: loser-fed matches and their winner-only descendants
 * stay in the lower bracket. Upper bracket keeps cross-bracket finals.
 */
export function splitDoubleEliminationMatches(matches: Match[]): {
  upper: Match[];
  lower: Match[];
} {
  const matchIds = new Set(matches.map((match) => match.id));
  const lowerIds = new Set<string>();

  for (const match of matches) {
    const hasLoserFeed = match.previousMatches?.some((link) => link.type === "loser");
    if (hasLoserFeed) {
      lowerIds.add(match.id);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const match of matches) {
      if (lowerIds.has(match.id)) {
        continue;
      }

      const parents = getParentIds(match, matchIds);
      if (parents.length === 0 || !parents.every((parentId) => lowerIds.has(parentId))) {
        continue;
      }

      lowerIds.add(match.id);
      changed = true;
    }
  }

  return {
    upper: matches.filter((match) => !lowerIds.has(match.id)),
    lower: sortMatchesByBeginAt(matches.filter((match) => lowerIds.has(match.id))),
  };
}

function collectTreeMatchIds(nodes: DrawnBracketMatch[]): Set<string> {
  const ids = new Set<string>();

  const walk = (node: DrawnBracketMatch): void => {
    ids.add(node.matchId);
    if (node.previousMatchA && typeof node.previousMatchA !== "string") {
      walk(node.previousMatchA);
    }
    if (node.previousMatchB && typeof node.previousMatchB !== "string") {
      walk(node.previousMatchB);
    }
  };

  for (const root of nodes) {
    walk(root);
  }

  return ids;
}

export function buildEliminationTree(matches: Match[]): DrawnBracketMatch[] {
  const matchesMap = new Map<string, BracketTreeNode>();

  for (const match of matches) {
    matchesMap.set(match.id, toBracketTreeNode(match));
  }

  const finals = [...matchesMap.values()].filter((match) => {
    for (const other of matchesMap.values()) {
      if (
        other.previousMatchA?.id === match.matchId ||
        other.previousMatchB?.id === match.matchId
      ) {
        return false;
      }
    }
    return true;
  });

  const drawnMatches: DrawnBracketMatch[] = [];
  const addedMatches = new Map<string, DrawnBracketMatch>();

  const processMatch = (match: BracketTreeNode): DrawnBracketMatch => {
    const cached = addedMatches.get(match.matchId);
    if (cached) {
      return cached;
    }

    const drawnMatch: DrawnBracketMatch = {
      matchId: match.matchId,
      teamA: match.teamA,
      teamB: match.teamB,
      participantAId: match.participantAId,
      participantBId: match.participantBId,
      results: match.results,
    };

    addedMatches.set(match.matchId, drawnMatch);

    if (match.previousMatchA) {
      const previousMatchA = matchesMap.get(match.previousMatchA.id);
      if (previousMatchA) {
        drawnMatch.previousMatchA = processMatch(previousMatchA);
      }
    }

    if (match.previousMatchB) {
      const previousMatchB = matchesMap.get(match.previousMatchB.id);
      if (previousMatchB) {
        drawnMatch.previousMatchB = processMatch(previousMatchB);
      }
    }

    drawnMatches.push(drawnMatch);
    return drawnMatch;
  };

  for (const finalMatch of finals) {
    processMatch(finalMatch);
  }

  const finalIds = new Set(finals.map((match) => match.matchId));
  return drawnMatches.filter((match) => finalIds.has(match.matchId));
}

function partitionOrphanMatches(matches: Match[], tree: DrawnBracketMatch[]): Match[] {
  const connectedIds = collectTreeMatchIds(tree);
  return sortMatchesByBeginAt(matches.filter((match) => !connectedIds.has(match.id)));
}

export function buildTournamentBracketView(tournament: Tournament): TournamentBracketView {
  const format = classifyTournamentBracket(tournament);
  const matches = tournament.matches ?? [];

  switch (format) {
    case "flat-stage":
      return {
        format,
        upperLayout: null,
        lowerLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: sortMatchesByBeginAt(matches),
        groupedMatches: [],
      };
    case "bracket-missing-links":
      return {
        format,
        upperLayout: null,
        lowerLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: groupMatchesByRound(matches),
      };
    case "linked-single-elimination":
      return {
        format,
        upperLayout: buildBracketSectionLayout(matches),
        lowerLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: [],
      };
    case "linked-double-elimination": {
      const { upper, lower } = splitDoubleEliminationMatches(matches);
      const lowerLayout = buildBracketSectionLayout(lower);
      const lowerEliminationTree = buildEliminationTree(lower);
      return {
        format,
        upperLayout: buildBracketSectionLayout(upper),
        lowerLayout,
        lowerBracketFlatMatches: partitionOrphanMatches(lower, lowerEliminationTree),
        flatMatches: [],
        groupedMatches: [],
      };
    }
    default: {
      const exhaustiveCheck: never = format;
      return exhaustiveCheck;
    }
  }
}
