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
