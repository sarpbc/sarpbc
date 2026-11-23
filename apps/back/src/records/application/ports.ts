import type {
  DataSource,
  RecordStage,
  RecordTeam,
  RecordVenue,
  TournamentFormat,
} from "@sarpbc/types";
import type { DecidedSeries } from "../domain/records";

export interface AlmanacTeam extends RecordTeam {
  id: string;
}

export interface AlmanacPlayer {
  id: string;
  name: string;
  slug: string;
  birthday: string | null;
}

export interface EventTitle {
  endAt: Date;
  venue: RecordVenue | null;
  nationalTeam: boolean;
  format: TournamentFormat;
  source: DataSource;
  stage: RecordStage;
  team: AlmanacTeam | null;
  players: AlmanacPlayer[];
}

export interface AlmanacSeries extends DecidedSeries {
  venue: RecordVenue | null;
  nationalTeams: boolean;
  format: TournamentFormat;
  source: DataSource;
  stageSource: DataSource;
}

export interface RecordSources {
  eventTitles: () => Promise<EventTitle[]>;
  decidedSeries: () => Promise<AlmanacSeries[]>;
  teams: (ids: string[]) => Promise<AlmanacTeam[]>;
}
