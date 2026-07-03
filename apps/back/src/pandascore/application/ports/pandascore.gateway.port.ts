import {
  PandascoreAdditionDto,
  PandascoreAdditionType,
  PandascoreAdditionsListDto,
} from "../../infrastructure/dto/addition.dto";
import { MatchDto } from "../../infrastructure/dto/match.dto";
import { TournamentDto } from "../../infrastructure/dto/tournament.dto";
import { TeamDto } from "../../infrastructure/dto/team.dto";
import { PlayerDto } from "../../infrastructure/dto/tournament.dto";
import { LeagueDto } from "../../infrastructure/dto/tournament.dto";

export interface ListAdditionsParams {
  since?: Date;
  type?: PandascoreAdditionType[];
  videogame?: string[];
  page?: number;
  perPage?: number;
  sort?: "modified_at" | "-modified_at" | "id" | "-id";
}

export interface PandascoreGateway {
  listAdditions(params?: ListAdditionsParams): Promise<PandascoreAdditionsListDto>;
  getTournaments(): Promise<TournamentDto[]>;
  getTournamentById(tournamentId: number): Promise<TournamentDto | null>;
  getTournamentBrackets(tournamentId: number): Promise<MatchDto[]>;
  getTournamentMatches(tournamentId: number): Promise<MatchDto[]>;
  getRocketLeaguePlayers(): Promise<
    Array<{
      name: string;
      slug: string;
      first_name?: string;
      last_name?: string;
      birthday?: string;
      nationality?: string;
      image_url?: string;
      current_team?: {
        id: number;
        name: string;
        slug: string;
        image_url?: string;
      };
    }>
  >;
}

export const PANDASCORE_GATEWAY = Symbol("PANDASCORE_GATEWAY");

export type {
  PandascoreAdditionDto,
  PandascoreAdditionType,
  PandascoreAdditionsListDto,
  TournamentDto,
  MatchDto,
  TeamDto,
  PlayerDto,
  LeagueDto,
};
