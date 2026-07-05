/** Shortens team labels in bracket match blocks. */
export function formatBracketTeamName(name: string): string {
  return name.replace(/\s+(?:Esports|Gaming)\b/gi, "").trim();
}
