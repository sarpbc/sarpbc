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

async function unused(): Promise<never> {
  return await Promise.reject(new Error("unused collaborator"));
}

/** Complete doubles: every method rejects unless the test overrides it. */
export function tournamentWriter(overrides: Partial<TournamentWriter> = {}): TournamentWriter {
  return {
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
  };
}

export function eventWriter(overrides: Partial<EventWriter> = {}): EventWriter {
  return {
    load: unused,
    bySerieId: unused,
    unclaimedByName: unused,
    slugTaken: unused,
    stageSlugTaken: unused,
    stages: unused,
    save: unused,
    remove: unused,
    ...overrides,
  };
}

export function matchWriter(overrides: Partial<MatchWriter> = {}): MatchWriter {
  return {
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
  };
}

export function rosterIdentityWriter(
  overrides: Partial<RosterIdentityWriter> = {},
): RosterIdentityWriter {
  return { upsertTeam: unused, upsertPlayer: unused, ...overrides };
}

export function awardWriter(overrides: Partial<AwardWriter> = {}): AwardWriter {
  return { context: unused, awardTaken: unused, create: unused, remove: unused, ...overrides };
}

export function prizeWriter(overrides: Partial<PrizeWriter> = {}): PrizeWriter {
  return {
    tournamentExists: unused,
    participants: unused,
    entries: unused,
    replace: unused,
    ...overrides,
  };
}

export function lineupWriter(overrides: Partial<LineupWriter> = {}): LineupWriter {
  return { activePlayersExist: unused, replace: unused, ...overrides };
}

export function competitionScope(
  overrides: Partial<CompetitionWriteScope> = {},
): CompetitionWriteScope {
  return {
    tournaments: tournamentWriter(),
    events: eventWriter(),
    matches: matchWriter(),
    rosters: rosterIdentityWriter(),
    awards: awardWriter(),
    prizes: prizeWriter(),
    lineups: lineupWriter(),
    ...overrides,
  };
}

export function matchQueries(overrides: Partial<MatchQueries> = {}): MatchQueries {
  return {
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
  };
}

export function eventQueries(overrides: Partial<EventQueries> = {}): EventQueries {
  return { list: unused, find: unused, unsynced: unused, stageId: unused, ...overrides };
}

export function tournamentQueries(overrides: Partial<TournamentQueries> = {}): TournamentQueries {
  return {
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
  };
}

export function competitionFeed(overrides: Partial<CompetitionFeed> = {}): CompetitionFeed {
  return {
    listIncidents: unused,
    getTournaments: unused,
    getTournamentById: unused,
    getTournamentBrackets: unused,
    getTournamentMatches: unused,
    getTournamentStandings: unused,
    ...overrides,
  };
}
