import type { MatchGameStats } from "@sarpbc/types";
import type { CandidateMatch, ReplaySummary, Side } from "../domain/replay-matching";
import type { StatsImport } from "../domain/stats-import";

export interface BallchasingSource {
  /** Replays of the group and of all its nested child groups. */
  groupReplays(groupId: string): Promise<ReplaySummary[]>;
  /** Null while Ballchasing has not finished processing the replay. */
  replayStats(replayId: string): Promise<ReplayStats | null>;
}

export interface ReplayPlayerStats {
  name: string;
  platform: string;
  platformId: string | null;
  side: Side;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demolitions: number;
}

export interface ReplayStats {
  blueGoals: number;
  orangeGoals: number;
  players: ReplayPlayerStats[];
}

export interface StatsCandidates {
  tournamentExists(tournamentId: string): Promise<boolean>;
  matches(tournamentId: string): Promise<CandidateMatch[]>;
}

export interface GamePlayerRecord extends ReplayPlayerStats {
  playerId: string | null;
}

export interface GameRecord {
  matchId: string;
  number: number;
  ballchasingId: string;
  rocketLeagueId: string | null;
  playedAt: Date | null;
  blueParticipantId: string;
  orangeParticipantId: string;
  blueGoals: number;
  orangeGoals: number;
  players: GamePlayerRecord[];
}

export interface GameStatsStore {
  importedReplayIds(replayIds: string[]): Promise<Set<string>>;
  /** Saves the game and its player rows atomically. */
  save(game: GameRecord): Promise<void>;
  byMatch(matchId: string): Promise<MatchGameStats[]>;
}

export interface StatsImportStore {
  create(statsImport: StatsImport): Promise<void>;
  load(id: string): Promise<StatsImport | null>;
  save(statsImport: StatsImport): Promise<void>;
  latest(tournamentId: string, limit: number): Promise<StatsImport[]>;
  /** Marks pending or running imports as failed; returns how many changed. */
  failUnfinished(error: string): Promise<number>;
}
