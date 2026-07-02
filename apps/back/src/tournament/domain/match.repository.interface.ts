import { Match, TournamentParticipant } from "../tournament.entities";

export interface UpsertMatchData {
  name: string;
  slug?: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  numberOfGames?: number;
  participantIds: string[];
  pandascoreId?: number;
  previous_matches?: { type: "winner" | "loser"; match_id: number }[];
  results?: { participantId: string | null; score: number }[];
}

export interface IMatchRepository {
  findUpcoming(options: { limit?: number; offset?: number; todayOnly?: boolean }): Promise<Match[]>;
  findLive(options: { limit?: number; offset?: number; todayOnly?: boolean }): Promise<Match[]>;
  findResults(options: { limit?: number; offset?: number }): Promise<Match[]>;
  findRecentlyEnded(options: { limit?: number; minutesAgo?: number }): Promise<Match[]>;
  findByTournament(tournamentId: string): Promise<Match[]>;
  findByPlayer(playerId: string): Promise<Match[]>;
  findByTeam(teamId: string): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  findByPandascoreId(pandascoreId: number): Promise<Match | null>;
  upsert(
    tournamentId: string,
    data: UpsertMatchData,
    participants: TournamentParticipant[],
  ): Promise<Match>;
  setWinner(match: Match, winner: TournamentParticipant): Promise<Match>;
  save(match: Match): Promise<void>;
  flush(): Promise<void>;
}
