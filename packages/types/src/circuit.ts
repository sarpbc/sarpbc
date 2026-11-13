import type { DataSource } from "./competition";
import type { TeamLogos } from "./team";
import type { TournamentEventRef } from "./tournament-event";

export interface CircuitScaleTier {
  from: number;
  to: number;
  points: number;
}

export interface CircuitInput {
  name: string;
  slug?: string;
  season: number;
  region?: string | null;
  description?: string | null;
  sourceUrl: string;
  qualificationSpots?: number | null;
}

export interface CircuitSummary {
  id: string;
  slug: string;
  name: string;
  season: number | null;
  region: string | null;
  description: string | null;
  sourceUrl: string | null;
  qualificationSpots: number | null;
}

export interface CircuitStageTournament {
  id: string;
  name: string;
  slug: string;
  source: DataSource;
  beginAt: string | null;
  endAt: string | null;
  event: TournamentEventRef;
}

export interface CircuitStage {
  tournament: CircuitStageTournament;
  scale: CircuitScaleTier[];
  sourceUrl: string;
}

export interface CircuitDetail extends CircuitSummary {
  stages: CircuitStage[];
}

export interface CircuitStageScaleInput {
  scale: CircuitScaleTier[];
  sourceUrl: string;
}

export type CircuitEventStatus =
  | "scale_missing"
  | "upcoming"
  | "in_progress"
  | "awaiting_results"
  | "counted";

export interface CircuitStandingsEvent {
  event: TournamentEventRef;
  beginAt: string | null;
  endAt: string | null;
  status: CircuitEventStatus;
}

export interface CircuitStandingCell {
  eventId: string;
  points: number;
  placement: number;
}

export interface CircuitStandingTeam extends Pick<TeamLogos, "imageUrl" | "darkModeImageUrl"> {
  id: string;
  name: string;
  slug: string;
}

export interface CircuitStandingRow {
  rank: number;
  points: number;
  team: CircuitStandingTeam;
  events: CircuitStandingCell[];
}

export interface CircuitStandings extends CircuitSummary {
  sourceUrls: string[];
  events: CircuitStandingsEvent[];
  rows: CircuitStandingRow[];
}
