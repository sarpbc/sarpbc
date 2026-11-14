import type { TournamentTab } from "@sarpbc/types";
import { isUuid } from "../../common/domain/entity-ref";

export type TournamentPath =
  | { kind: "legacyStage"; id: string; tab: TournamentTab }
  | { kind: "event"; eventSlug: string }
  | { kind: "stage"; eventSlug: string; stageSlug: string };

export const parseTournamentPath = (segments: readonly string[]): TournamentPath | null => {
  const [first, second, ...rest] = segments.map((segment) => segment.toLowerCase());

  if (!first || rest.length > 0) {
    return null;
  }

  if (isUuid(first)) {
    if (second === undefined) {
      return { id: first, kind: "legacyStage", tab: "overview" };
    }

    return second === "matches" ? { id: first, kind: "legacyStage", tab: "matches" } : null;
  }

  if (second === undefined) {
    return { eventSlug: first, kind: "event" };
  }

  return second ? { eventSlug: first, kind: "stage", stageSlug: second } : null;
};
