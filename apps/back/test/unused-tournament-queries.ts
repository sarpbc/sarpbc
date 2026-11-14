import type { TournamentQueries } from "../src/tournament/application/ports";

const unused = async (): Promise<never> => await Promise.reject(new Error("unused"));

/** A complete TournamentQueries whose every method rejects; spread it and override what a test reads. */
export const unusedTournamentQueries: TournamentQueries = {
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
};
