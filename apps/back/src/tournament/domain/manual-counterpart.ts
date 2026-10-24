const DAY_MS = 24 * 60 * 60 * 1000;
const SEARCH_LOOKBACK_MS = 31 * DAY_MS;

export interface ManualCandidate {
  id: string;
  name: string;
  leagueId: string | null;
  beginAt: Date | null;
  endAt: Date | null;
}

export interface ProviderStage {
  fullName: string;
  leagueId: string | null;
  beginAt: Date | null;
  endAt: Date | null;
}

export type CounterpartMatch =
  | { kind: "none" }
  | { kind: "unique"; id: string }
  | { kind: "ambiguous"; ids: string[] };

function nameKey(name: string): string {
  const tokens = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return [...new Set(tokens)].sort().join(" ");
}

function overlaps(candidate: ManualCandidate, stage: ProviderStage): boolean {
  if (!candidate.beginAt || !stage.beginAt) return false;
  const candidateEnd = candidate.endAt ?? candidate.beginAt;
  const stageEnd = stage.endAt ?? stage.beginAt;
  return (
    candidate.beginAt.getTime() <= stageEnd.getTime() + DAY_MS &&
    stage.beginAt.getTime() <= candidateEnd.getTime() + DAY_MS
  );
}

export function counterpartSearchWindow(stage: ProviderStage): { from: Date; to: Date } | null {
  if (!stage.beginAt) return null;
  const end = stage.endAt ?? stage.beginAt;
  return {
    from: new Date(stage.beginAt.getTime() - SEARCH_LOOKBACK_MS),
    to: new Date(end.getTime() + DAY_MS),
  };
}

export function findManualCounterpart(
  stage: ProviderStage,
  candidates: readonly ManualCandidate[],
): CounterpartMatch {
  const name = nameKey(stage.fullName);
  if (!name) return { kind: "none" };
  const ids = candidates
    .filter(
      (candidate) =>
        nameKey(candidate.name) === name &&
        (candidate.leagueId === null || candidate.leagueId === stage.leagueId) &&
        overlaps(candidate, stage),
    )
    .map((candidate) => candidate.id);
  if (ids.length === 1) return { kind: "unique", id: ids[0] };
  return ids.length ? { kind: "ambiguous", ids } : { kind: "none" };
}
