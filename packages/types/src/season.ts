import type { DataSource } from "./competition";
import type { TournamentEventRef } from "./tournament-event";

export const SEASON_AWARD_TYPES = ["season_mvp", "regular_season_mvp", "regional_mvp"] as const;

export type SeasonAwardType = (typeof SEASON_AWARD_TYPES)[number];

export interface SeasonSummary {
  id: string;
  name: string;
  slug: string | null;
}

export interface SeasonFormatPhase {
  name: string;
  description: string | null;
}

export interface SeasonFormat {
  summary: string | null;
  phases: SeasonFormatPhase[];
}

export interface SeasonInput {
  name: string;
  slug?: string | null;
  format?: SeasonFormat;
  winnerTeamId?: string | null;
}

export interface SeasonTeam {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  darkModeImageUrl: string | null;
}

export interface SeasonPathTournament {
  id: string;
  name: string;
  slug: string;
  source: DataSource;
  event: TournamentEventRef;
}

export interface SeasonPathEntry {
  id: string;
  label: string;
  result: string;
  tournament: SeasonPathTournament | null;
}

export interface SeasonParticipant {
  id: string;
  team: SeasonTeam;
  pathNote: string | null;
  path: SeasonPathEntry[];
}

export interface SeasonParticipantInput {
  teamId: string;
  pathNote?: string | null;
}

export interface SeasonPathEntryInput {
  label: string;
  result: string;
  tournamentId?: string | null;
}

export interface SeasonAward {
  id: string;
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
  player: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SeasonDetail extends SeasonSummary {
  format: SeasonFormat;
  winnerTeamId: string | null;
  participants: SeasonParticipant[];
  awards: SeasonAward[];
}

export interface SeasonAwardInput {
  playerId: string;
  awardType: SeasonAwardType;
  region?: string | null;
  presentedBy?: string | null;
  sourceUrl: string;
}

export interface PlayerSeasonAward {
  id: string;
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
  season: SeasonSummary;
}

export interface SeasonArchiveSummary {
  slug: string;
  name: string;
  winner: SeasonTeam | null;
}

export interface SeasonArchivePathEntry {
  label: string;
  result: string;
  tournament: Omit<SeasonPathTournament, "source"> | null;
}

export interface SeasonArchiveParticipant {
  team: SeasonTeam;
  pathNote: string | null;
  path: SeasonArchivePathEntry[];
}

export interface SeasonArchiveAward {
  awardType: SeasonAwardType;
  region: string | null;
  presentedBy: string | null;
  sourceUrl: string;
  player: { name: string; slug: string };
}

export interface SeasonArchive {
  slug: string;
  name: string;
  format: SeasonFormat;
  winner: SeasonTeam | null;
  participants: SeasonArchiveParticipant[];
  awards: SeasonArchiveAward[];
}
