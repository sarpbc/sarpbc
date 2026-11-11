import type { DataSource, ProfileMatchListItem } from "./competition";

export interface MatchLineupInput {
  participantId: string;
  playerIds: string[];
}

export interface MatchLineupPlayer {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  nationality: string | null;
  standIn: boolean;
}

export interface MatchLineup {
  participantId: string;
  players: MatchLineupPlayer[];
}

export interface MatchLineupsResponse {
  source: DataSource;
  lineups: MatchLineup[];
  suggested: MatchLineupInput[];
}

export interface PlayerStandIn {
  participantId: string;
  startgg: boolean;
  match: ProfileMatchListItem;
}
