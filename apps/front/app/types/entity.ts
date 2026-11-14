import type { ProfileMatchListItem, TournamentEventRef } from "@sarpbc/types";
import type { TournamentStatus } from "~/utils/tournament-status";

export type EntityKind = "team" | "player";

export type EntityEventsKind = EntityKind | "staff";

export interface EntityTrophyListItem {
  id: string;
  path: string;
  displayName: string;
  formatLabel: string | null;
  endAt: Date | string | null;
}

export interface EntityEventListItem {
  id: string;
  name: string;
  slug: string;
  event: TournamentEventRef;
  formatLabel: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  status: TournamentStatus;
  isWinner: boolean;
}

export interface EntitySections<T> {
  live: T[];
  upcoming: T[];
  past: T[];
}

export type EntityMatchSections = EntitySections<ProfileMatchListItem>;
