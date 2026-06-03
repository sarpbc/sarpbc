export interface PandascoreMatch {
  begin_at?: string | null;
  detailed_stats?: boolean;
  draw?: boolean;
  end_at?: string | null;
  forfeit?: boolean;
  game_advantage?: number | null;
  games?: PandascoreGame[];
  id: number;
  league?: PandascoreLeague;
  league_id?: number | null;
  live?: PandascoreLive;
  match_type?: string | null;
  modified_at?: string | null;
  name?: string;
  number_of_games?: number | null;
  opponents?: PandascoreOpponentWrapper[];
  original_scheduled_at?: string | null;
  previous_matches?: { type: "winner" | "loser"; match_id: number }[];
  rescheduled?: boolean;
  results?: PandascoreResult[];
  scheduled_at?: string | null;
  serie?: PandascoreSerie | null;
  serie_id?: number | null;
  slug?: string | null;
  status?: string | null;
  streams_list?: PandascoreStream[];
  tournament?: PandascoreTournamentRef | null;
  tournament_id?: number | null;
  videogame?: PandascoreVideoGame | null;
  videogame_title?: string | null;
  videogame_version?: string | null;
  winner?: PandascoreWinner | null;
  winner_id?: number | null;
  winner_type?: string | null;
  [key: string]: any;
}

export interface PandascoreGame {
  begin_at?: string | null;
  complete?: boolean;
  detailed_stats?: boolean;
  end_at?: string | null;
  finished?: boolean;
  forfeit?: boolean;
  id: number;
  length?: number | null;
  match_id?: number | null;
  position?: number | null;
  status?: string | null;
  winner?: PandascoreWinnerRef | null;
  winner_type?: string | null;
  [key: string]: any;
}

export interface PandascoreWinnerRef {
  id: number;
  type: string; // e.g. 'Team' or 'Player'
}

export interface PandascoreOpponentWrapper {
  opponent: PandascoreOpponent;
  type?: string; // usually 'Team' or 'Player'
}

export interface PandascoreOpponent {
  acronym?: string | null;
  id: number;
  image_url?: string | null;
  location?: string | null;
  modified_at?: string | null;
  name?: string;
  slug?: string | null;
  [key: string]: any;
}

export interface PandascoreLeague {
  id: number;
  image_url?: string | null;
  modified_at?: string | null;
  name?: string;
  slug?: string | null;
  url?: string | null;
  [key: string]: any;
}

export interface PandascoreLive {
  opens_at?: string | null;
  supported?: boolean;
  url?: string | null;
}

export interface PandascoreResult {
  score?: number;
  team_id?: number | null;
}

export interface PandascoreSerie {
  begin_at?: string | null;
  end_at?: string | null;
  full_name?: string | null;
  id?: number;
  league_id?: number | null;
  modified_at?: string | null;
  name?: string | null;
  season?: string | null;
  slug?: string | null;
  winner_id?: number | null;
  winner_type?: string | null;
  year?: number | null;
}

export interface PandascoreStream {
  embed_url?: string | null;
  language?: string | null;
  main?: boolean;
  official?: boolean;
  raw_url?: string | null;
}

export interface PandascoreTournamentRef {
  begin_at?: string | null;
  country?: string | null;
  detailed_stats?: boolean;
  end_at?: string | null;
  has_bracket?: boolean;
  id?: number;
  league_id?: number | null;
  live_supported?: boolean;
  modified_at?: string | null;
  name?: string | null;
  prizepool?: any;
  region?: string | null;
  serie_id?: number | null;
  slug?: string | null;
  tier?: string | null;
  type?: string | null;
  winner_id?: number | null;
  winner_type?: string | null;
}

export interface PandascoreVideoGame {
  id?: number;
  name?: string | null;
  slug?: string | null;
}

export interface PandascoreWinner {
  acronym?: string | null;
  id?: number;
  image_url?: string | null;
  location?: string | null;
  modified_at?: string | null;
  name?: string | null;
  slug?: string | null;
}
