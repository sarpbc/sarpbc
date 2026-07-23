export class RosterPlayerDto {
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

export class CurrentVideogameDto {
  id!: number;
  name!: string;
  slug!: string;
}

export class RosterTeamDto {
  id!: number;
  name!: string;
  location!: string;
  slug!: string;
  players!: RosterPlayerDto[];
  modified_at!: string;
  acronym!: string;
  image_url!: string;
  current_videogame!: CurrentVideogameDto;
}

export class RostersListDto {
  type!: string;
  rosters!: RosterTeamDto[];
}
