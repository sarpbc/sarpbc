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

const unused = async () => await Promise.reject(new Error("unused collaborator"));

export const tournamentWriter = (overrides: Partial<TournamentWriter> = {}) => ({
  byPandascoreId: unused,
  league: unused,
  leagueByPandascoreId: unused,
  load: unused,
  manualCandidates: unused,
  participantReferences: unused,
  participants: unused,
  playersExist: unused,
  remove: unused,
  removeParticipant: unused,
  save: unused,
  saveLeague: unused,
  saveParticipant: unused,
  setPlacements: unused,
  teamPlayers: unused,
  teamsExist: unused,
  ...overrides,
});

export const eventWriter = (overrides: Partial<EventWriter> = {}) => ({
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

export const matchWriter = (overrides: Partial<MatchWriter> = {}) => ({
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

export const rosterIdentityWriter = (overrides: Partial<RosterIdentityWriter> = {}) => ({
  upsertPlayer: unused,
  upsertTeam: unused,
  ...overrides,
});

const awardWriter = (overrides: Partial<AwardWriter> = {}) => ({
  awardTaken: unused,
  context: unused,
  create: unused,
  remove: unused,
  ...overrides,
});

const prizeWriter = (overrides: Partial<PrizeWriter> = {}) => ({
  entries: unused,
  participants: unused,
  replace: unused,
  tournamentExists: unused,
  ...overrides,
});

export const lineupWriter = (overrides: Partial<LineupWriter> = {}) => ({
  activePlayersExist: unused,
  replace: unused,
  ...overrides,
});

export const competitionScope = (overrides: Partial<CompetitionWriteScope> = {}) => ({
  awards: awardWriter(),
  events: eventWriter(),
  lineups: lineupWriter(),
  matches: matchWriter(),
  prizes: prizeWriter(),
  rosters: rosterIdentityWriter(),
  tournaments: tournamentWriter(),
  ...overrides,
});

export const matchQueries = (overrides: Partial<MatchQueries> = {}) => ({
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

export const eventQueries = (overrides: Partial<EventQueries> = {}) => ({
  find: unused,
  list: unused,
  stageId: unused,
  unsynced: unused,
  ...overrides,
});

export const tournamentQueries = (overrides: Partial<TournamentQueries> = {}) => ({
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
