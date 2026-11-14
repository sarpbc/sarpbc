import type { NamedPick, Pick, PickMatch } from "../domain/pickem";

export interface PickFilter {
  userId?: string;
  scoredOnly?: boolean;
}

export interface PickemReads {
  list(tournamentId: string, filter?: PickFilter): Promise<NamedPick[]>;
}

export interface PickemMatches {
  find(id: string): Promise<PickMatch | null>;
  decide(matchId: string, winnerId: string): Promise<void>;
}

export interface PickemWrites {
  userExists(id: string): Promise<boolean>;
  participantExists(id: string): Promise<boolean>;
  pick(userId: string, matchId: string): Promise<Pick | null>;
  unscored(matchId: string): Promise<Pick[]>;
  savePick(pick: Pick): Promise<void>;
}

export interface PickemTransaction {
  run<T>(work: (scope: PickemWrites) => Promise<T>): Promise<T>;
}

export interface PickemRuntime {
  now(): Date;
  id(): string;
  warn(message: string): void;
}

export interface UserPickDto {
  match: string;
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
}

export interface LeaderboardEntryDto {
  userId: string;
  userName: string;
  points: number;
}

export interface PersonalRankingDto {
  rank: number | null;
  total: number;
  points: number;
}
