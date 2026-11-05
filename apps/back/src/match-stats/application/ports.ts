import type {
  MatchGameStats,
  StatsPlayerAccount,
  StatsRoster,
  TournamentStatsGame,
} from "@sarpbc/types";
import type { CandidateMatch, GameLocation, ReplaySummary, Side } from "../domain/replay-matching";
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
  rocketLeagueId: string | null;
  playedAt: Date | null;
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

export interface GameAttachment extends GameLocation {
  tournamentName: string;
  teams: [string, string];
}

export interface GameStatsStore {
  /** Where each of these replays is stored, for those that are. */
  locations(replayIds: string[]): Promise<Map<string, GameLocation>>;
  /** The replays among these that staff removed. */
  excluded(replayIds: string[]): Promise<Set<string>>;
  attachment(replayId: string): Promise<GameAttachment | null>;
  links(accounts: PlatformAccount[]): Promise<PlayerLink[]>;
  /**
   * Saves the game, its player rows and its learned links atomically, links earlier unlinked
   * rows of each learned account and clears any staff exclusion of the replay.
   */
  save(game: GameRecord): Promise<void>;
  byMatch(matchId: string): Promise<MatchGameStats[]>;
  inTournament(tournamentId: string): Promise<TournamentStatsGame[]>;
  /** Deletes the game with its player rows and excludes its replay atomically. */
  remove(tournamentId: string, location: GameLocation): Promise<TournamentStatsGame | null>;
}

export interface PlayerLinkStore {
  /** Every game account with a platform id that played in the tournament. */
  accounts(tournamentId: string): Promise<StatsPlayerAccount[]>;
  rosters(tournamentId: string): Promise<StatsRoster[]>;
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

/** Runs a queued import outside the request that queued it. */
export interface StatsImportScheduler {
  schedule(task: () => Promise<void>): void;
}
