import { Tournament } from "./tournament.entity";

export interface UpsertTournamentData {
  id: number;
  name: string;
  slug?: string;
  serie?: { full_name?: string };
  tier?: string;
  begin_at?: string;
  end_at?: string;
  prizepool?: string;
  type?: string;
  winner_type?: string;
  league?: any;
}

export interface ITournamentRepository {
  find(options: { limit?: number; offset?: number; pickems?: boolean }): Promise<Tournament[]>;
  findById(id: string): Promise<Tournament | null>;
  findByPandascoreId(pandascoreId: number): Promise<Tournament | null>;
  findAll(fields?: string[]): Promise<Tournament[]>;
  save(tournament: Tournament): Promise<void>;
  saveMany(tournaments: Tournament[]): Promise<void>;
  flush(): Promise<void>;
}
