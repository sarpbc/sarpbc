/** Query key carrying discovery source onto `/matches/:id` for CTR. */
export const MATCH_DISCOVERY_FROM_QUERY = "from";

export const MATCH_DISCOVERY_SOURCES = [
  "matches_list",
  "home_strip",
  "lateral_bar",
  "tournament_hub",
] as const;

export type MatchDiscoverySource = (typeof MATCH_DISCOVERY_SOURCES)[number];

export type MatchDiscoveryStatus = "live" | "upcoming" | "finished";

const SOURCE_SET = new Set<string>(MATCH_DISCOVERY_SOURCES);

export function isMatchDiscoverySource(value: unknown): value is MatchDiscoverySource {
  return typeof value === "string" && SOURCE_SET.has(value);
}

export function parseMatchDiscoverySource(value: unknown): MatchDiscoverySource | null {
  if (Array.isArray(value)) {
    return parseMatchDiscoverySource(value[0]);
  }

  return isMatchDiscoverySource(value) ? value : null;
}

export function listVariantToDiscoveryStatus(
  variant: "live" | "upcoming" | "result",
): MatchDiscoveryStatus {
  switch (variant) {
    case "live":
      return "live";
    case "upcoming":
      return "upcoming";
    case "result":
      return "finished";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function resolveMatchDiscoveryStatus(input: {
  endAt?: Date | string | null;
  beginAt?: Date | string | null;
  status?: string | null;
  now?: number;
}): MatchDiscoveryStatus {
  const now = input.now ?? Date.now();
  const beginAt = input.beginAt ? new Date(input.beginAt).getTime() : null;

  if (input.endAt || input.status === "finished") {
    return "finished";
  }

  if (beginAt !== null && beginAt <= now) {
    return "live";
  }

  return "upcoming";
}

export function buildMatchDetailTo(
  localePath: (path: string) => string,
  matchId: string,
  source: MatchDiscoverySource,
): { path: string; query: { from: MatchDiscoverySource } } {
  return {
    path: localePath(`/matches/${matchId}`),
    query: { from: source },
  };
}
