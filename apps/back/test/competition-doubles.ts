import type {
  AwardWriter,
  CompetitionWriteScope,
  EventQueries,
  EventWriter,
  LineupWriter,
  MatchQueries,
  MatchWriter,
  PrizeWriter,
  RosterIdentityWriter,
  TournamentQueries,
  TournamentWriter,
} from "../src/tournament/application/ports";
import type { CompetitionFeed } from "../src/tournament/application/feed";

const unused = async (): Promise<never> => await Promise.reject(new Error("unused collaborator"));

/** Complete doubles: every method rejects unless the test overrides it. */
export const tournamentWriter = (overrides: Partial<TournamentWriter> = {}): TournamentWriter => ({
  load: unused,
  byPandascoreId: unused,
  manualCandidates: unused,
  save: unused,
  league: unused,
  leagueByPandascoreId: unused,
  saveLeague: unused,
  participants: unused,
  saveParticipant: unused,
  setPlacements: unused,
  removeParticipant: unused,
  participantReferences: unused,
  teamsExist: unused,
  playersExist: unused,
  teamPlayers: unused,
  ...overrides,
});

export const eventWriter = (overrides: Partial<EventWriter> = {}): EventWriter => ({
  load: unused,
  bySerieId: unused,
  unclaimedByName: unused,
  slugTaken: unused,
  stageSlugTaken: unused,
  stages: unused,
  save: unused,
  remove: unused,
  ...overrides,
});

export const matchWriter = (overrides: Partial<MatchWriter> = {}): MatchWriter => ({
  load: unused,
  byPandascoreId: unused,
  save: unused,
  references: unused,
  remove: unused,
  timings: unused,
  tournament: unused,
  participants: unused,
  bracket: unused,
  ...overrides,
});

export const rosterIdentityWriter = (
  overrides: Partial<RosterIdentityWriter> = {},
): RosterIdentityWriter => ({ upsertTeam: unused, upsertPlayer: unused, ...overrides });

export const awardWriter = (overrides: Partial<AwardWriter> = {}): AwardWriter => ({
  context: unused,
  awardTaken: unused,
  create: unused,
  remove: unused,
  ...overrides,
});

export const prizeWriter = (overrides: Partial<PrizeWriter> = {}): PrizeWriter => ({
  tournamentExists: unused,
  participants: unused,
  entries: unused,
  replace: unused,
  ...overrides,
});

export const lineupWriter = (overrides: Partial<LineupWriter> = {}): LineupWriter => ({
  activePlayersExist: unused,
  replace: unused,
  ...overrides,
});

export const competitionScope = (
  overrides: Partial<CompetitionWriteScope> = {},
): CompetitionWriteScope => ({
  tournaments: tournamentWriter(),
  events: eventWriter(),
  matches: matchWriter(),
  rosters: rosterIdentityWriter(),
  awards: awardWriter(),
  prizes: prizeWriter(),
  lineups: lineupWriter(),
  ...overrides,
});

export const matchQueries = (overrides: Partial<MatchQueries> = {}): MatchQueries => ({
  list: unused,
  page: unused,
  byIds: unused,
  recentlyEnded: unused,
  detail: unused,
  recentByTeam: unused,
  betweenTeams: unused,
  byPlayer: unused,
  byTeam: unused,
  byTournament: unused,
  ...overrides,
});

export const eventQueries = (overrides: Partial<EventQueries> = {}): EventQueries => ({
  list: unused,
  find: unused,
  unsynced: unused,
  stageId: unused,
  ...overrides,
});

export const tournamentQueries = (
  overrides: Partial<TournamentQueries> = {},
): TournamentQueries => ({
  find: unused,
  searchByName: unused,
  findById: unused,
  findPandascoreWithoutMatches: unused,
  findPandascoreActive: unused,
  getTournamentsByPlayer: unused,
  getTournamentsByTeam: unused,
  getTournamentsByTeamTenures: unused,
  getTournamentsWonByPlayer: unused,
  getTournamentsWonByTeam: unused,
  wonOnDay: unused,
  finalsOnDay: unused,
  knownPandascoreIds: unused,
  findByPandascoreId: unused,
  leagues: unused,
  ...overrides,
});

export const competitionFeed = (overrides: Partial<CompetitionFeed> = {}): CompetitionFeed => ({
  listIncidents: unused,
  getTournaments: unused,
  getTournamentById: unused,
  getTournamentBrackets: unused,
  getTournamentMatches: unused,
  getTournamentStandings: unused,
  ...overrides,
});
