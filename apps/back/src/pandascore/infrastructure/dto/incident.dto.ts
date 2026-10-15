import { MatchDto } from "./match.dto";
import { TeamDto } from "./team.dto";
import { LeagueDto, PlayerDto, SerieDto, TournamentDto } from "./tournament.dto";

export type PandascoreIncidentType =
  | "league"
  | "match"
  | "player"
  | "serie"
  | "team"
  | "tournament";

export interface PandascoreCurrentTeamDto {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  dark_mode_image_url?: string | null;
}

export type PandascoreIncidentPlayerDto = PlayerDto & {
  current_team: PandascoreCurrentTeamDto | null;
};

interface PandascoreIncidentBase {
  id: number;
  modified_at: string;
}

type PandascoreUpsertIncident = { change_type: "creation" | "update" } & (
  | { type: "tournament"; object: TournamentDto }
  | { type: "match"; object: MatchDto }
  | { type: "team"; object: TeamDto }
  | { type: "player"; object: PandascoreIncidentPlayerDto }
  | { type: "league"; object: LeagueDto }
  | { type: "serie"; object: SerieDto }
);

interface PandascoreDeletionIncident {
  change_type: "deletion";
  type: PandascoreIncidentType;
  object: { reason: string; deleted_at: string };
}

export type PandascoreIncidentDto = PandascoreIncidentBase &
  (PandascoreUpsertIncident | PandascoreDeletionIncident);

export type PandascoreIncidentsListDto = PandascoreIncidentDto[];
