/** PandaScore names carry generic words; a name made only of them is kept whole. */
export const shortTeamName = (name: string): string => {
  const short = name
    .replaceAll(/\b(?:Esports?|Gaming|Team)\b/giu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

  return short || name;
};
