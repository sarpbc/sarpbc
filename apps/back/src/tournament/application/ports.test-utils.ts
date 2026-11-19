import { competitionScope as unusedScope } from "../../../test/competition-doubles";
import type { League } from "../domain/league";
import type { Match, TournamentSummary } from "../domain/match";
import type { MatchDecided } from "../domain/match-decided";
import type { MatchReferences } from "../domain/match-deletion";
import type { StageBracket } from "../domain/bracket";
import type { MatchTiming } from "../domain/tournament-end";
import type { Tournament } from "../domain/tournament";
import type { TournamentEvent } from "../domain/tournament-event";
import type {
  ParticipantReferences,
  ParticipantSnapshot,
  TournamentParticipant,
} from "../domain/tournament-participant";
import type { Player } from "../../roster/domain/player";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  EventStage,
  SyncCursor,
} from "./ports";

const NO_PARTICIPANT_REFERENCES: ParticipantReferences = {
  matchParticipant: false,
  matchWinner: false,
  results: false,
  tournamentWinner: false,
};

const NO_MATCH_REFERENCES: MatchReferences = { comments: 0, nextMatches: 0, picks: 0 };

/** Tournament write port over in-memory state. Seed the public collections, assert on them after. */
export const memoryTournamentWriter = () => {
  const tournaments = new Map<string, Tournament>();
  const leagues = new Map<string, League>();
  const participantsByTournament = new Map<string, TournamentParticipant[]>();
  const playersByTeam = new Map<string, Player[]>();
  const referencesByParticipant = new Map<string, ParticipantReferences>();
  const unknownTeamIds = new Set<string>();
  const unknownPlayerIds = new Set<string>();
  const savedTournaments: Tournament[] = [];
  const savedParticipants: ParticipantSnapshot[] = [];
  const removedTournamentIds: string[] = [];
  const removedParticipantIds: string[] = [];
  const placements: ReadonlyMap<string, number | null>[] = [];

  return {
    byPandascoreId: async (id: number) =>
      [...tournaments.values()].find((tournament) => tournament.pandascoreId === id) ?? null,
    league: async (id: string) => leagues.get(id) ?? null,
    leagueByPandascoreId: async (id: number) =>
      [...leagues.values()].find((league) => league.pandascoreId === id) ?? null,
    leagues,
    load: async (id: string) => tournaments.get(id) ?? null,
    manualCandidates: async () => [],
    participantReferences: async (tournamentId: string, participantId: string) =>
      referencesByParticipant.get(`${tournamentId}:${participantId}`) ?? NO_PARTICIPANT_REFERENCES,
    participants: async (id: string) => participantsByTournament.get(id) ?? [],
    participantsByTournament,
    placements,
    playersByTeam,
    playersExist: async (ids: string[]) => ids.every((id) => !unknownPlayerIds.has(id)),
    referencesByParticipant,
    remove: async (id: string) => {
      removedTournamentIds.push(id);
      tournaments.delete(id);
    },
    removeParticipant: async (id: string) => {
      removedParticipantIds.push(id);
    },
    removedParticipantIds,
    removedTournamentIds,
    save: async (tournament: Tournament) => {
      savedTournaments.push(tournament);
      tournaments.set(tournament.id, tournament);
    },
    saveLeague: async (league: League) => {
      leagues.set(league.id, league);
    },
    saveParticipant: async (participant: ParticipantSnapshot) => {
      savedParticipants.push(participant);
    },
    savedParticipants,
    savedTournaments,
    setPlacements: async (next: ReadonlyMap<string, number | null>) => {
      placements.push(next);
    },
    teamPlayers: async (teamId: string) => playersByTeam.get(teamId) ?? [],
    teamsExist: async (ids: string[]) => ids.every((id) => !unknownTeamIds.has(id)),
    tournaments,
    unknownPlayerIds,
    unknownTeamIds,
  };
};

/** Event write port over in-memory state. */
export const memoryEventWriter = () => {
  const events = new Map<string, TournamentEvent>();
  const stagesByEvent = new Map<string, EventStage[]>();
  const takenStageSlugs = new Set<string>();

  return {
    bySerieId: async (id: number) =>
      [...events.values()].find((event) => event.pandascoreSerieId === id) ?? null,
    events,
    load: async (id: string) => events.get(id) ?? null,
    remove: async (id: string) => {
      events.delete(id);
    },
    save: async (event: TournamentEvent) => {
      events.set(event.id, event);
    },
    slugTaken: async (slug: string, exceptEventId: string | null) =>
      [...events.values()].some((event) => event.slug === slug && event.id !== exceptEventId),
    stageSlugTaken: async (eventId: string, slug: string) =>
      takenStageSlugs.has(`${eventId}:${slug}`),
    stages: async (eventId: string) => stagesByEvent.get(eventId) ?? [],
    stagesByEvent,
    takenStageSlugs,
    unclaimedByName: async () => null,
  };
};

/** Match write port over in-memory state. */
export const memoryMatchWriter = () => {
  const matches = new Map<string, Match>();
  const summaries = new Map<string, TournamentSummary>();
  const participantsByTournament = new Map<string, TournamentParticipant[]>();
  const timingsByTournament = new Map<string, MatchTiming[]>();
  const bracketsByTournament = new Map<string, StageBracket>();
  const referencesByMatch = new Map<string, MatchReferences>();
  const savedMatches: Match[] = [];

  return {
    bracket: async (tournamentId: string) =>
      bracketsByTournament.get(tournamentId) ?? { hasBracket: false, matches: [] },
    bracketsByTournament,
    byPandascoreId: async (id: number) =>
      [...matches.values()].find((match) => match.pandascoreId === id) ?? null,
    load: async (id: string) => matches.get(id) ?? null,
    matches,
    participants: async (tournamentId: string) => participantsByTournament.get(tournamentId) ?? [],
    participantsByTournament,
    references: async (id: string) => referencesByMatch.get(id) ?? NO_MATCH_REFERENCES,
    referencesByMatch,
    remove: async (id: string) => {
      matches.delete(id);
    },
    save: async (match: Match) => {
      savedMatches.push(match);
      matches.set(match.id, match);
    },
    savedMatches,
    summaries,
    timings: async (tournamentId: string) => timingsByTournament.get(tournamentId) ?? [],
    timingsByTournament,
    tournament: async (id: string) => summaries.get(id) ?? null,
  };
};

export const recordingDiagnostics = () => {
  const errors: { message: string; cause: unknown }[] = [];

  const warnings: {
    message: string;
    context: Record<string, string | number | readonly string[]>;
  }[] = [];

  return {
    error: (message: string, cause: unknown) => {
      errors.push({ cause, message });
    },
    errors,
    warn: (message: string, context: Record<string, string | number | readonly string[]>) => {
      warnings.push({ context, message });
    },
    warnings,
  };
};

/** Cache that rejects after `failWith(error)`. */
export const recordingCache = () => {
  const invalidated: string[] = [];
  let failure: Error | null = null;

  return {
    failWith: (error: Error) => {
      failure = error;
    },
    invalidateTournament: async (id: string) => {
      if (failure) {
        throw failure;
      }

      invalidated.push(id);
    },
    invalidated,
  };
};

/** Event bus that rejects after `failWith(error)`. */
export const recordingEvents = () => {
  const published: MatchDecided[] = [];
  let failure: Error | null = null;

  return {
    failWith: (error: Error) => {
      failure = error;
    },
    publish: async (event: MatchDecided) => {
      if (failure) {
        throw failure;
      }

      published.push(event);
    },
    published,
  };
};

export const memorySyncCursor = () => {
  let lastSyncAt: Date | null = null;

  return {
    getLastSyncAt: async () => lastSyncAt,
    setLastSyncAt: async (date: Date) => {
      lastSyncAt = date;
    },
  } satisfies SyncCursor;
};

/** Ports left out of `scope` reject on use, so a test only exercises what it declares. */
export const transactionOver = (scope: Partial<CompetitionWriteScope>) =>
  ({ run: async (work) => await work(unusedScope(scope)) }) satisfies CompetitionTransaction;
