import { isUuid } from "../../common/domain/entity-ref";

export type StageTab = "overview" | "matches";

export type TournamentPath =
  | { kind: "legacyStage"; id: string; tab: StageTab }
  | { kind: "event"; eventSlug: string }
  | { kind: "stage"; eventSlug: string; stageSlug: string };

export function parseTournamentPath(segments: readonly string[]): TournamentPath | null {
  const [first, second, ...rest] = segments.map((segment) => segment.toLowerCase());
  if (!first || rest.length > 0) return null;
  if (isUuid(first)) {
    if (second === undefined) return { kind: "legacyStage", id: first, tab: "overview" };
    return second === "matches" ? { kind: "legacyStage", id: first, tab: "matches" } : null;
  }
  if (second === undefined) return { kind: "event", eventSlug: first };
  return second ? { kind: "stage", eventSlug: first, stageSlug: second } : null;
}
