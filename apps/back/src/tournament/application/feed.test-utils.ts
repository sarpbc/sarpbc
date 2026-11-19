import type {
  CompetitionFeed,
  CompetitionIncident,
  UpsertMatchCommand,
  UpsertTournamentCommand,
} from "./feed";

type FeedMethod = "getTournamentById" | "getTournamentMatches";

type Standings = Awaited<ReturnType<CompetitionFeed["getTournamentStandings"]>>;

/** Provider feed over in-memory data. Seed the public collections, read the request logs after. */
export const memoryFeed = () => {
  const tournaments: UpsertTournamentCommand[] = [];
  const tournamentsById = new Map<number, UpsertTournamentCommand | null>();
  const matchesByTournament = new Map<number, UpsertMatchCommand[]>();
  const bracketsByTournament = new Map<number, UpsertMatchCommand[]>();
  const standingsByTournament = new Map<number, Standings>();
  const incidents: CompetitionIncident[] = [];
  const failures = new Map<FeedMethod, Error>();
  const requestedTournaments: number[] = [];
  const requestedIncidents: { since: Date }[] = [];

  const failIfNeeded = (method: FeedMethod) => {
    const failure = failures.get(method);

    if (failure) {
      throw failure;
    }
  };

  return {
    bracketsByTournament,
    failOn: (method: FeedMethod, error: Error) => {
      failures.set(method, error);
    },
    getTournamentBrackets: async (id: number) => bracketsByTournament.get(id) ?? [],
    getTournamentById: async (id: number) => {
      requestedTournaments.push(id);
      failIfNeeded("getTournamentById");

      return tournamentsById.get(id) ?? null;
    },
    getTournamentMatches: async (id: number) => {
      failIfNeeded("getTournamentMatches");

      return matchesByTournament.get(id) ?? [];
    },
    getTournamentStandings: async (id: number) => standingsByTournament.get(id) ?? null,
    getTournaments: async () => tournaments,
    incidents,
    listIncidents: async (params: { since: Date }) => {
      requestedIncidents.push(params);

      return incidents;
    },
    matchesByTournament,
    requestedIncidents,
    requestedTournaments,
    standingsByTournament,
    tournaments,
    tournamentsById,
  };
};
