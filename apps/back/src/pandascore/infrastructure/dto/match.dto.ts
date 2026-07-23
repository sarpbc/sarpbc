export class MatchResultDto {
  team_id!: number;
  score!: number;
}

export class MatchLiveDto {
  supported!: boolean;
  url!: string | null;
  opens_at!: string | null;
}

export class MatchOpponentTeamDto {
  id!: number;
  name!: string;
  location!: string;
  slug!: string;
  modified_at!: string;
  acronym!: string;
  image_url!: string;
}

export class MatchOpponentDto {
  type!: string;
  opponent!: MatchOpponentTeamDto;
}

export class PreviousMatchDto {
  type!: "loser" | "winner";
  match_id!: number;
}

export class GameWinnerDto {
  id!: number;
  type!: string;
}

export class GameDto {
  complete!: boolean;
  id!: number;
  position!: number;
  status!: string;
  length!: number;
  finished!: boolean;
  begin_at!: string;
  detailed_stats!: boolean;
  end_at!: string;
  forfeit!: boolean;
  match_id!: number;
  winner_type!: string;
  winner!: GameWinnerDto;
}

export class MatchStreamDto {
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
  results!: MatchResultDto[];
  live!: MatchLiveDto;
  begin_at!: string;
  detailed_stats!: boolean;
  end_at!: string;
  forfeit!: boolean;
  winner_id!: number;
  winner_type!: string;
  draw!: boolean;
  slug!: string;
  modified_at!: string;
  tournament_id!: number;
  match_type!: string;
  number_of_games!: number;
  scheduled_at!: string;
  opponents!: MatchOpponentDto[];
  previous_matches!: PreviousMatchDto[];
  original_scheduled_at!: string;
  games!: GameDto[];
  streams_list!: MatchStreamDto[];
}

export type MatchesListDto = MatchDto[];
