import type { TournamentEventRef } from "./tournament-event";

export type TournamentSource = "pandascore" | "manual";

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
}

export interface TournamentListItem {
  id: string;
  source: TournamentSource;
  name: string;
  slug: string;
  event: TournamentEventRef;
  type: string | null;
  prizepool: string | null;
  imageUrl: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  pickemsEnabled: boolean;
  winnerId: string | null;
  league: { id: string; name: string; imageUrl: string | null } | null;
  participants: { id: string; team: TeamSummary }[];
}

export interface TournamentMatchListItem {
  id: string;
  publicId: number;
  slug: string;
  status: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  participants: { id: string; team: { id: string; name: string } }[];
  results: { participant: string; score: number }[];
}
