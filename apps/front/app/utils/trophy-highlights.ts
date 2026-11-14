import { isNonEmptyDateInput } from "@sarpbc/utils";

export const formatTrophyHighlightNames = (
  trophies: readonly { displayName: string; endAt: Date | string | null }[],
  limit = 3,
): string => {
  const sorted = trophies.toSorted((a, b) => {
    const aTime = isNonEmptyDateInput(a.endAt) ? new Date(a.endAt).getTime() : 0;
    const bTime = isNonEmptyDateInput(b.endAt) ? new Date(b.endAt).getTime() : 0;

    return bTime - aTime;
  });

  const names: string[] = [];
  const seen = new Set<string>();

  for (const trophy of sorted) {
    if (!trophy.displayName || seen.has(trophy.displayName)) {
      continue;
    }

    seen.add(trophy.displayName);
    names.push(trophy.displayName);

    if (names.length >= limit) {
      break;
    }
  }

  return names.join(", ");
};
