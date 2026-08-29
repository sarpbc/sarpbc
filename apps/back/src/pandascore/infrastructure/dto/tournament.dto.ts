export class LiveDto {
  supported!: boolean;
  url!: string | null;
  opens_at!: string | null;
}

export class StreamDto {
  main!: boolean;
  language!: string;
  embed_url!: string;
  official!: boolean;
  raw_url!: string;
}

export class MatchDto {
  id!: number;
  name!: string;
  status!: string;
  live!: LiveDto;
  slug!: string;
  begin_at!: string;
  detailed_stats!: boolean;
  end_at!: string;
  forfeit!: boolean;
  winner_id!: number | null;
  winner_type!: string;
  draw!: boolean;
  modified_at!: string;
  tournament_id!: number;
  match_type!: string;
  number_of_games!: number;
  scheduled_at!: string;
  original_scheduled_at!: string;
  streams_list!: StreamDto[];
  rescheduled!: boolean;
}

export class TeamDto {
  id!: number;
  name!: string;
  location!: string;
  slug!: string;
  modified_at!: string;
  acronym!: string;
  image_url!: string;
  dark_mode_image_url!: string | null;
}

export class PlayerDto {
  active!: boolean;
  id!: number;
  name!: string;
  role!: string | null;
  slug!: string;
  modified_at!: string;
  age!: number | null;
  birthday!: string | null;
  first_name!: string;
  last_name!: string | null;
  nationality!: string;
  image_url!: string | null;
}

export class ExpectedRosterDto {
  players!: PlayerDto[];
  team!: TeamDto;
}

export class VideogameDto {
  id!: number;
  name!: string;
  slug!: string;
}

export class LeagueDto {
  id!: number;
  name!: string;
  url!: string | null;
  slug!: string;
  modified_at!: string;
  image_url!: string;
}

export class SerieDto {
  id!: number;
  name!: string;
  year!: number;
  slug!: string;
  begin_at!: string;
  end_at!: string;
  winner_id!: number | null;
  winner_type!: string;
  modified_at!: string;
  league_id!: number;
  // season: any | null;
  full_name!: string;
}

export class TournamentDto {
  id!: number;
  name!: string;
  type!: string;
  matches!: MatchDto[];
  country!: string;
  slug!: string;
  begin_at!: string;
  detailed_stats!: boolean;
  end_at!: string;
  winner_id!: number | null;
  winner_type!: string;
  teams!: TeamDto[];
  serie_id!: number;
  serie!: SerieDto;
  modified_at!: string;
  videogame!: VideogameDto;
  league_id!: number;
  league!: LeagueDto;
  prizepool!: number | null;
  tier!: string;
  videogame_title!: string | null;
  has_bracket!: boolean;
  region!: string;
  live_supported!: boolean;
  expected_roster!: ExpectedRosterDto[];
}
