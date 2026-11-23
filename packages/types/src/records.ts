import type { TeamLogos } from "./team";

export const RECORD_TABLE_SIZE = 10;

export const RECORD_VENUES = ["lan", "online"] as const;

export type RecordVenue = (typeof RECORD_VENUES)[number];

export interface RecordTeam extends TeamLogos {
  name: string;
  slug: string;
}

export interface RecordPlayer {
  name: string;
  slug: string;
}

export interface RecordStage {
  name: string;
  slug: string;
  event: { name: string; slug: string };
}

export interface TeamTitlesRecord {
  rank: number;
  team: RecordTeam;
  titles: number;
}

export interface PlayerTitlesRecord {
  rank: number;
  player: RecordPlayer;
  titles: number;
}

export interface WinStreakRecord {
  rank: number;
  team: RecordTeam;
  series: number;
  from: string;
  to: string;
}

export interface YoungestChampionRecord {
  rank: number;
  player: RecordPlayer;
  age: { years: number; days: number };
  date: string;
  stage: RecordStage;
}

export interface RecordBook {
  venue: RecordVenue | null;
  teamTitles: TeamTitlesRecord[];
  playerTitles: PlayerTitlesRecord[];
  winStreaks: WinStreakRecord[];
  youngestChampions: YoungestChampionRecord[];
}
