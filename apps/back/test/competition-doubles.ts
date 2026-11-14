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
  byPandascoreId: unused,
  league: unused,
  leagueByPandascoreId: unused,
  load: unused,
  manualCandidates: unused,
  participantReferences: unused,
  participants: unused,
  playersExist: unused,
  removeParticipant: unused,
  save: unused,
  saveLeague: unused,
  saveParticipant: unused,
  setPlacements: unused,
  teamPlayers: unused,
  teamsExist: unused,
  ...overrides,
});

export const eventWriter = (overrides: Partial<EventWriter> = {}): EventWriter => ({
  bySerieId: unused,
  load: unused,
  remove: unused,
  save: unused,
  slugTaken: unused,
  stageSlugTaken: unused,
  stages: unused,
  unclaimedByName: unused,
  ...overrides,
});

export const matchWriter = (overrides: Partial<MatchWriter> = {}): MatchWriter => ({
  bracket: unused,
  byPandascoreId: unused,
  load: unused,
  participants: unused,
  references: unused,
  remove: unused,
  save: unused,
  timings: unused,
  tournament: unused,
  ...overrides,
});

export const rosterIdentityWriter = (
  overrides: Partial<RosterIdentityWriter> = {},
): RosterIdentityWriter => ({ upsertPlayer: unused, upsertTeam: unused, ...overrides });

export const awardWriter = (overrides: Partial<AwardWriter> = {}): AwardWriter => ({
  awardTaken: unused,
  context: unused,
  create: unused,
  remove: unused,
  ...overrides,
});

export const prizeWriter = (overrides: Partial<PrizeWriter> = {}): PrizeWriter => ({
  entries: unused,
  participants: unused,
  replace: unused,
  tournamentExists: unused,
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
  awards: awardWriter(),
  events: eventWriter(),
  lineups: lineupWriter(),
  matches: matchWriter(),
  prizes: prizeWriter(),
  rosters: rosterIdentityWriter(),
  tournaments: tournamentWriter(),
  ...overrides,
});

export const matchQueries = (overrides: Partial<MatchQueries> = {}): MatchQueries => ({
  betweenTeams: unused,
  byIds: unused,
  byPlayer: unused,
  byTeam: unused,
  byTournament: unused,
  detail: unused,
  list: unused,
  page: unused,
  recentByTeam: unused,
  recentlyEnded: unused,
  ...overrides,
});

export const eventQueries = (overrides: Partial<EventQueries> = {}): EventQueries => ({
  find: unused,
  list: unused,
  stageId: unused,
  unsynced: unused,
  ...overrides,
});

export const tournamentQueries = (
  overrides: Partial<TournamentQueries> = {},
): TournamentQueries => ({
  finalsOnDay: unused,
  find: unused,
  findById: unused,
  findByPandascoreId: unused,
  findPandascoreActive: unused,
  findPandascoreWithoutMatches: unused,
  getTournamentsByPlayer: unused,
  getTournamentsByTeam: unused,
  getTournamentsByTeamTenures: unused,
  getTournamentsWonByPlayer: unused,
  getTournamentsWonByTeam: unused,
  knownPandascoreIds: unused,
  leagues: unused,
  searchByName: unused,
  wonOnDay: unused,
  ...overrides,
});

export const competitionFeed = (overrides: Partial<CompetitionFeed> = {}): CompetitionFeed => ({
  getTournamentBrackets: unused,
  getTournamentById: unused,
  getTournamentMatches: unused,
  getTournamentStandings: unused,
  getTournaments: unused,
  listIncidents: unused,
  ...overrides,
});
