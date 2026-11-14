/** PandaScore names carry generic words; a name made only of them is kept whole. */
export function shortTeamName(name: string): string {
  const short = name
    .replaceAll(/\b(?:Esports?|Gaming|Team)\b/gi, "")
    .replaceAll(/\s+/g, " ")
    .trim();

  return short || name;
}
