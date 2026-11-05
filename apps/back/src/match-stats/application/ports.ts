import type { MatchGameStats, UnlinkedStatsPlayer } from "@sarpbc/types";
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

export interface PlatformAccount {
  platform: string;
  platformId: string;
}

export interface PlayerLink extends PlatformAccount {
  playerId: string;
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
  /** Links taught by unique roster-name matches; an existing link is never replaced. */
  learnedLinks: PlayerLink[];
}

export interface GameStatsStore {
  importedReplayIds(replayIds: string[]): Promise<Set<string>>;
  links(accounts: PlatformAccount[]): Promise<PlayerLink[]>;
  /**
   * Saves the game, its player rows and its learned links atomically, and links earlier
   * unlinked rows of each learned account.
   */
  save(game: GameRecord): Promise<void>;
  byMatch(matchId: string): Promise<MatchGameStats[]>;
}

export interface PlayerLinkStore {
  unlinked(tournamentId: string): Promise<UnlinkedStatsPlayer[]>;
  onTournamentRoster(tournamentId: string, playerId: string): Promise<boolean>;
  /** Replaces the account's link and repoints all its stat rows atomically; returns the rows repointed. */
  link(link: PlayerLink): Promise<number>;
}

export interface StatsImportStore {
  create(statsImport: StatsImport): Promise<void>;
  load(id: string): Promise<StatsImport | null>;
  save(statsImport: StatsImport): Promise<void>;
  latest(tournamentId: string, limit: number): Promise<StatsImport[]>;
  /** Marks pending or running imports as failed; returns how many changed. */
  failUnfinished(error: string): Promise<number>;
}
