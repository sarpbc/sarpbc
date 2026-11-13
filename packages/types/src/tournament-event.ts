import type { TournamentDetail, TournamentListItem } from "./competition";
import type { League } from "./league";
import type { Viewership } from "./viewership";

export interface TournamentEventRef {
  id: string;
  slug: string;
  name: string;
}

/** One PandaScore serie or manual tournament. Its stages are tournaments, newest first. */
export interface TournamentEvent<Stage> extends TournamentEventRef {
  league: League | null;
  logoUrl: string | null;
  prizepool: string | null;
  type: string | null;
  beginAt: string | null;
  endAt: string | null;
  /** List responses carry list items; the event detail embeds full stages for the brackets. */
  stages: Stage[];
}

export interface TournamentEventDetail extends TournamentEvent<TournamentDetail> {
  viewership: Viewership | null;
}

export interface ManualEvent extends TournamentEvent<TournamentListItem> {
  editable: boolean;
}

export interface EventInput {
  name?: string;
  slug?: string;
  leagueId?: string | null;
}

export type TournamentTab = "overview" | "matches" | "stats";

export type TournamentPathResponse =
  | { kind: "event"; event: TournamentEventDetail }
  | { kind: "stage"; tournament: TournamentDetail; tab: TournamentTab };
