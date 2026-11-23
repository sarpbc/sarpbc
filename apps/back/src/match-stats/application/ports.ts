import type {
  MatchGameStats,
  StatsPlayerAccount,
  StatsRoster,
  TournamentStatsGame,
} from "@sarpbc/types";
import type { PlayerStatsSummary, StatsScope } from "../domain/player-stats";
import type { CandidateMatch, GameLocation, ReplaySummary, Side } from "../domain/replay-matching";
import type { StatsImport } from "../domain/stats-import";

export interface BallchasingSource {
  groupReplays: (groupId: string) => Promise<ReplaySummary[]>;
  /** Null while Ballchasing has not finished processing the replay. */
  replayStats: (replayId: string) => Promise<ReplayStats | null>;
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
  tournamentExists: (tournamentId: string) => Promise<boolean>;
  matches: (tournamentId: string) => Promise<CandidateMatch[]>;
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

/** One Ballchasing replay of a game; goals and player sides are in the game's orientation. */
export interface GameReplayRecord {
  ballchasingId: string;
  rocketLeagueId: string | null;
  playedAt: Date | null;
  blueGoals: number;
  orangeGoals: number;
  players: GamePlayerRecord[];
}

export interface GameRecord {
  matchId: string;
  number: number;
  blueParticipantId: string;
  orangeParticipantId: string;
  /** In play order. */
  replays: GameReplayRecord[];
  /** Links taught by unique roster-name matches; an existing link is never replaced. */
  learnedLinks: PlayerLink[];
}

export interface ReplayAppend {
  replay: GameReplayRecord;
  learnedLinks: PlayerLink[];
}

export interface GameAttachment extends GameLocation {
  tournamentName: string;
  teams: [string, string];
}

export interface GameStatsStore {
  locations: (replayIds: string[]) => Promise<Map<string, GameLocation>>;
  excluded: (replayIds: string[]) => Promise<Set<string>>;
  attachment: (replayId: string) => Promise<GameAttachment | null>;
  links: (accounts: PlatformAccount[]) => Promise<PlayerLink[]>;
  /**
   * Saves the game, its replays, their player rows and its learned links atomically, links
   * earlier unlinked rows of each learned account and clears any staff exclusion of its replays.
   */
  save: (game: GameRecord) => Promise<TournamentStatsGame>;
  /** Saves the replay after the game's last one, the same way `save` saves a game. */
  appendReplay: (
    tournamentId: string,
    location: GameLocation,
    append: ReplayAppend,
  ) => Promise<TournamentStatsGame | null>;
  game: (tournamentId: string, location: GameLocation) => Promise<TournamentStatsGame | null>;
  byMatch: (matchId: string) => Promise<MatchGameStats[]>;
  inTournament: (tournamentId: string) => Promise<TournamentStatsGame[]>;
  playerStats: (scope: StatsScope) => Promise<PlayerStatsSummary>;
  /** Deletes the game with its replays and player rows and excludes every replay atomically. */
  remove: (tournamentId: string, location: GameLocation) => Promise<TournamentStatsGame | null>;
  /** Deletes one replay of the game with its player rows and excludes it atomically. */
  removeReplay: (
    tournamentId: string,
    location: GameLocation,
    replayId: string,
  ) => Promise<TournamentStatsGame | null>;
}

export interface PlayerLinkStore {
  accounts: (tournamentId: string) => Promise<StatsPlayerAccount[]>;
  rosters: (tournamentId: string) => Promise<StatsRoster[]>;
  onTournamentRoster: (tournamentId: string, playerId: string) => Promise<boolean>;
  /** Replaces the account's link and repoints all its stat rows atomically; returns the rows repointed. */
  link: (link: PlayerLink) => Promise<number>;
}

export interface StatsImportStore {
  create: (statsImport: StatsImport) => Promise<void>;
  load: (id: string) => Promise<StatsImport | null>;
  save: (statsImport: StatsImport) => Promise<void>;
  latest: (tournamentId: string, limit: number) => Promise<StatsImport[]>;
  failUnfinished: (error: string) => Promise<number>;
}

export interface StatsImportScheduler {
  schedule: (task: () => Promise<void>) => void;
}
