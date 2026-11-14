import type { TournamentQueries } from "../src/tournament/application/ports";

const unused = async (): Promise<never> => await Promise.reject(new Error("unused"));

/** A complete TournamentQueries whose every method rejects; spread it and override what a test reads. */
export const unusedTournamentQueries: TournamentQueries = {
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
};
