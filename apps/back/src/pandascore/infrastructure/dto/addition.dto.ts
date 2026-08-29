import { MatchDto } from "./match.dto";
import { TeamDto } from "./team.dto";
import { LeagueDto, PlayerDto, SerieDto, TournamentDto } from "./tournament.dto";

export type PandascoreAdditionType =
  | "league"
  | "match"
  | "player"
  | "serie"
  | "team"
  | "tournament";

interface PandascoreAdditionBase {
  id: number;
  change_type: "creation";
  modified_at: string;
}

export type PandascoreAdditionDto =
  | (PandascoreAdditionBase & { type: "tournament"; object: TournamentDto })
  | (PandascoreAdditionBase & { type: "match"; object: MatchDto })
  | (PandascoreAdditionBase & { type: "team"; object: TeamDto })
  | (PandascoreAdditionBase & { type: "player"; object: PlayerDto })
  | (PandascoreAdditionBase & { type: "league"; object: LeagueDto })
  | (PandascoreAdditionBase & { type: "serie"; object: SerieDto });

export type PandascoreAdditionsListDto = PandascoreAdditionDto[];
