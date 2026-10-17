import type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import type {
  League,
  Match,
  Tournament,
  TournamentParticipant,
  TournamentSummary,
  ParticipantSnapshot,
  ParticipantReferences,
} from "../domain/competition";
import type { UpsertPlayerCommand } from "../../pandascore/application/commands/upsert-player.command";
import type { UpsertTeamCommand } from "../../pandascore/application/commands/upsert-team.command";
import type { MatchListQueryOptions } from "./match/match-list-filters";
import type { TournamentListOptions } from "./inputs";
export interface TournamentQueries {
  find(options: TournamentListOptions): Promise<[Tournament[], number]>;
  searchByName(options: { name: string; limit?: number; offset?: number }): Promise<Tournament[]>;
  findById(id: string): Promise<Tournament | null>;
  findPandascoreWithoutMatches(): Promise<Pick<Tournament, "id" | "name">[]>;
  findPandascoreActive(options: {
    beginsBefore: Date;
    beganAfter: Date;
    endsAfter: Date;
  }): Promise<{ id: string }[]>;
  getTournamentsByPlayer(id: string): Promise<Tournament[]>;
  getTournamentsByTeam(id: string): Promise<Tournament[]>;
  getTournamentsWonByPlayer(id: string): Promise<Tournament[]>;
  getTournamentsWonByTeam(id: string): Promise<Tournament[]>;
  knownPandascoreIds(): Promise<Set<number>>;
  findByPandascoreId(id: number): Promise<Tournament | null>;
  leagues(options: { limit?: number; offset?: number }): Promise<League[]>;
}
export interface MatchQueries {
  list(
    kind: "upcoming" | "live" | "results",
    options: MatchListQueryOptions,
  ): Promise<[Match[], number]>;
  recentlyEnded(options: { limit?: number; minutesAgo?: number }): Promise<Match[]>;
  detail(id: string): Promise<Match | null>;
  recentByTeam(options: {
    teamId: string;
    excludeMatchId: string;
    limit: number;
  }): Promise<Match[]>;
  betweenTeams(options: {
    teamAId: string;
    teamBId: string;
    excludeMatchId: string;
    limit: number;
  }): Promise<Match[]>;
  byPlayer(id: string): Promise<Match[]>;
  byTeam(id: string): Promise<Match[]>;
  byTournament(id: string): Promise<Match[]>;
}
export interface TournamentWriter {
  load(id: string): Promise<Tournament | null>;
  byPandascoreId(id: number): Promise<Tournament | null>;
  bySlug(slug: string): Promise<Tournament | null>;
  save(tournament: Tournament): Promise<void>;
  league(id: string): Promise<League | null>;
  leagueByPandascoreId(id: number): Promise<League | null>;
  saveLeague(league: League): Promise<void>;
  participants(id: string): Promise<TournamentParticipant[]>;
  saveParticipant(participant: ParticipantSnapshot): Promise<void>;
  removeParticipant(id: string): Promise<void>;
  participantReferences(
    tournamentId: string,
    participantId: string,
  ): Promise<ParticipantReferences>;
  teamsExist(ids: string[]): Promise<boolean>;
}
export interface MatchWriter {
  load(id: string): Promise<Match | null>;
  byPandascoreId(id: number): Promise<Match | null>;
  save(match: Match): Promise<void>;
  tournament(id: string): Promise<TournamentSummary | null>;
  participants(tournamentId: string): Promise<TournamentParticipant[]>;
}
export interface RosterIdentityWriter {
  upsertTeam(command: UpsertTeamCommand): Promise<{ id: string }>;
  upsertPlayer(
    command: UpsertPlayerCommand,
    currentTeamId?: string | null,
  ): Promise<{ id: string }>;
}
export interface AwardContext {
  tournament: { id: string; name: string } | null;
  participant: { id: string; team: { id: string; name: string }; playerIds: string[] } | null;
  player: { id: string; name: string; slug: string } | null;
}
export interface AwardWriter {
  context(tournamentId: string, participantId: string, playerId: string): Promise<AwardContext>;
  create(input: {
    tournamentId: string;
    participantId: string;
    playerId: string;
    awardType: PlayerAwardType;
  }): Promise<TournamentAwardListItem>;
  remove(tournamentId: string, awardId: string): Promise<boolean>;
}
export interface AwardQueries {
  byPlayer(id: string): Promise<PlayerProfileAward[] | null>;
  byTournament(id: string): Promise<TournamentAwardListItem[] | null>;
}
export interface CompetitionWriteScope {
  tournaments: TournamentWriter;
  matches: MatchWriter;
  rosters: RosterIdentityWriter;
  awards: AwardWriter;
}
export interface CompetitionTransaction {
  run<T>(work: (scope: CompetitionWriteScope) => Promise<T>): Promise<T>;
}
export interface CompetitionCache {
  invalidateTournament(id: string): Promise<void>;
}
export interface MatchScoring {
  autoScoreMatch(id: string): Promise<unknown>;
}
export interface CompetitionDiagnostics {
  error(message: string, error: unknown): void;
}
