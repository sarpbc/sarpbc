export class TeamPlayerDto {
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

export class TeamVideogameDto {
  id!: number;
  name!: string;
  slug!: string;
}

export class TeamDto {
  id!: number;
  name!: string;
  location!: string;
  slug!: string;
  players!: TeamPlayerDto[];
  modified_at!: string;
  acronym!: string;
  image_url!: string;
  dark_mode_image_url!: string | null;
  current_videogame!: TeamVideogameDto;
}
