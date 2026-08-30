const GENERIC_STAGE_NAMES = new Set([
  "playoffs",
  "group stage",
  "group a",
  "group b",
  "group c",
  "group d",
  "swiss",
  "main event",
  "grand finals",
  "finals",
]);

function isYearOnlySerie(serie: string): boolean {
  return /^\d{4}$/.test(serie);
}

function isGenericStageName(name: string): boolean {
  return GENERIC_STAGE_NAMES.has(name.trim().toLowerCase());
}

function serieIncludesLeague(serie: string, league: string): boolean {
  return serie.toLowerCase().startsWith(league.toLowerCase());
}

export function tournamentEventDisplayName(input: {
  name: string;
  leagueName?: string | null;
  serie?: string | null;
}): string {
  const league = input.leagueName?.trim();
  const serie = input.serie?.trim();
  const stage = input.name.trim();

  if (serie) {
    if (isYearOnlySerie(serie)) {
      if (league) return `${league} ${serie}`;
      if (stage && !isGenericStageName(stage)) return stage;
      return serie;
    }

    if (league && !serieIncludesLeague(serie, league)) {
      return `${league} ${serie}`;
    }
    return serie;
  }

  if (league && stage && !isGenericStageName(stage)) {
    return `${league} ${stage}`;
  }

  if (league && stage) {
    return `${league} ${stage}`;
  }

  return stage || league || "";
}

export function formatTrophyHighlightNames(
  trophies: ReadonlyArray<{ displayName: string; endAt: Date | string | null }>,
  limit = 3,
): string {
  const sorted = [...trophies].sort((a, b) => {
    const aTime = a.endAt ? new Date(a.endAt).getTime() : 0;
    const bTime = b.endAt ? new Date(b.endAt).getTime() : 0;
    return bTime - aTime;
  });

  const names: string[] = [];
  const seen = new Set<string>();

  for (const trophy of sorted) {
    if (!trophy.displayName || seen.has(trophy.displayName)) continue;
    seen.add(trophy.displayName);
    names.push(trophy.displayName);
    if (names.length >= limit) break;
  }

  return names.join(", ");
}
