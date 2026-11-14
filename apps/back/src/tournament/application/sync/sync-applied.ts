import type { Tournament } from "../../domain/tournament";

export interface Applied {
  stageIds: string[];
  matches: string[];
}

export interface AppliedTournament {
  tournament: Tournament;
  stageIds: string[];
}
