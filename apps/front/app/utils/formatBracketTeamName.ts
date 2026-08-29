/** PandaScore names often suffix a generic Esports/Gaming word. */
export function formatBracketTeamName(name: string): string {
  return name.replace(/\s+(?:Esports|Gaming)\b/gi, "").trim();
}
