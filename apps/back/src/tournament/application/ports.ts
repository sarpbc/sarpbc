import type {
  DataSource,
  PlayerAwardType,
  PlayerProfileAward,
  TournamentAwardListItem,
  TournamentPrizes,
} from "@sarpbc/types";
import type {
  League,
  Match,
  Tournament,
  TournamentParticipant,
  TournamentSummary,
  ParticipantSnapshot,
  ParticipantReferences,
} from "../domain/competition";
import type { TournamentEvent } from "../domain/tournament-event";
import type { ManualCandidate } from "../domain/manual-counterpart";
import type { MatchTiming } from "../domain/tournament-end";
import type { MatchDecided } from "../domain/match-decided";
import type { UpsertPlayerCommand, UpsertTeamCommand } from "../../roster/application/imports";
import type { EntityRef } from "../../common/domain/entity-ref";
import type { MatchListQueryOptions } from "./match/match-list-filters";
import type { TournamentListOptions } from "./inputs";
import type { PrizeEntry } from "../domain/prize-distribution";
import type { EarningsLine } from "./earnings";
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
  detail(ref: EntityRef): Promise<Match | null>;
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
  manualCandidates(window: { from: Date; to: Date }): Promise<ManualCandidate[]>;
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
export interface EventStage {
  id: string;
  name: string;
}
export interface EventWriter {
  load(id: string): Promise<TournamentEvent | null>;
  bySerieId(id: number): Promise<TournamentEvent | null>;
  unclaimedByName(leagueId: string | null, name: string): Promise<TournamentEvent | null>;
  slugTaken(slug: string, exceptEventId: string | null): Promise<boolean>;
  stageSlugTaken(eventId: string, slug: string, exceptTournamentId: string): Promise<boolean>;
  stages(eventId: string): Promise<EventStage[]>;
  save(event: TournamentEvent): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface EventListing {
  event: TournamentEvent;
  stages: Tournament[];
}
export interface EventQueries {
  list(options: TournamentListOptions): Promise<[EventListing[], number]>;
  bySlug(slug: string): Promise<{ event: TournamentEvent; stageIds: string[] } | null>;
  stageId(eventSlug: string, stageSlug: string): Promise<string | null>;
}
export interface MatchWriter {
  load(id: string): Promise<Match | null>;
  byPandascoreId(id: number): Promise<Match | null>;
  save(match: Match): Promise<void>;
  timings(tournamentId: string): Promise<MatchTiming[]>;
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
export interface EarningsScope {
  redistributableOnly: boolean;
}
export interface PrizeQueries {
  tournamentSource(id: string): Promise<DataSource | null>;
  byTournament(id: string): Promise<TournamentPrizes | null>;
  byTeam(id: string, scope: EarningsScope): Promise<EarningsLine[]>;
  byPlayer(id: string, scope: EarningsScope): Promise<EarningsLine[]>;
}
export interface PrizeParticipant {
  teamId: string;
  playerIds: string[];
}
export interface PrizeWriter {
  tournamentExists(id: string): Promise<boolean>;
  participants(tournamentId: string): Promise<PrizeParticipant[]>;
  replace(tournamentId: string, entries: PrizeEntry[]): Promise<void>;
}
export interface PrizeTransaction {
  run<T>(work: (scope: Pick<CompetitionWriteScope, "prizes">) => Promise<T>): Promise<T>;
}
export interface CompetitionWriteScope {
  tournaments: TournamentWriter;
  events: EventWriter;
  matches: MatchWriter;
  rosters: RosterIdentityWriter;
  awards: AwardWriter;
  prizes: PrizeWriter;
}
export interface CompetitionTransaction {
  run<T>(work: (scope: CompetitionWriteScope) => Promise<T>): Promise<T>;
}
export interface SyncCursor {
  getLastSyncAt(): Promise<Date | null>;
  setLastSyncAt(date: Date): Promise<void>;
}
export interface CompetitionCache {
  invalidateTournament(id: string): Promise<void>;
}
export interface CompetitionEvents {
  publish(event: MatchDecided): Promise<void>;
}
export interface CompetitionDiagnostics {
  error(message: string, error: unknown): void;
  warn(message: string, context: { pandascoreId: number; tournamentIds: string[] }): void;
}
