import type { Match } from "~/types/matches";
import { computeChronologicalColumns } from "./columns";
import { finalizeSectionLayout, toLayoutMatch } from "./connectors";
import { assignMatchRows } from "./rows";
import type { BracketSectionLayout } from "./types";

export function buildBracketSectionLayout(matches: Match[]): BracketSectionLayout | null {
  if (matches.length === 0) {
    return null;
  }

  const columns = computeChronologicalColumns(matches);
  const rows = assignMatchRows(matches, columns);
  const maxColumn = Math.max(...columns.values());

  const layoutMatches = matches.map((match) =>
    toLayoutMatch(match, columns.get(match.id) ?? 0, rows.get(match.id) ?? 0),
  );

  return finalizeSectionLayout(matches, layoutMatches, maxColumn);
}
