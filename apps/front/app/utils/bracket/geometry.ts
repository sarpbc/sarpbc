export const BRACKET_MATCH_WIDTH = 148;
export const BRACKET_MATCH_HEIGHT = 44;
export const BRACKET_TEAM_ROW_HEIGHT = BRACKET_MATCH_HEIGHT / 2;
export const BRACKET_COLUMN_GAP = 12;
export const BRACKET_VERTICAL_GAP = 6;
/** Half a match block so stacked rows share a midpoint with connectors. */
export const BRACKET_ROW_STEP = (BRACKET_MATCH_HEIGHT + BRACKET_VERTICAL_GAP) / 2;

export function bracketMatchLeft(column: number): number {
  return column * (BRACKET_MATCH_WIDTH + BRACKET_COLUMN_GAP);
}

export function bracketMatchTop(row: number): number {
  return row * BRACKET_ROW_STEP;
}

export function bracketMatchCenterY(row: number): number {
  return bracketMatchTop(row) + BRACKET_MATCH_HEIGHT / 2;
}

export function bracketTeamRowCenterY(row: number, slot: "a" | "b"): number {
  const top = bracketMatchTop(row);
  if (slot === "a") {
    return top + BRACKET_TEAM_ROW_HEIGHT / 2;
  }

  return top + BRACKET_TEAM_ROW_HEIGHT + BRACKET_TEAM_ROW_HEIGHT / 2;
}
