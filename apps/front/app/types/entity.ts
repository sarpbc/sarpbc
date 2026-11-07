import type { ProfileMatchListItem, TournamentEventRef } from "@sarpbc/types";
import type { TournamentStatus } from "~/utils/tournamentStatus";

export type EntityKind = "team" | "player";

export interface EntityTrophyListItem {
  id: string;
  path: string;
  displayName: string;
  endAt: Date | string | null;
}

export interface EntityEventListItem {
  id: string;
  name: string;
  slug: string;
  event: TournamentEventRef;
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
