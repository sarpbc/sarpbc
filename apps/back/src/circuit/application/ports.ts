import type { CircuitStage, CircuitEventTeam, CircuitSummary, DataSource } from "@sarpbc/types";
import type { CircuitStageSettings } from "../domain/circuit-scale";
import type { CircuitStageResult } from "../domain/circuit-standings";

export interface StoredStageResult extends CircuitStageResult {
  source: DataSource;
}

export interface CircuitStore {
  list(): Promise<CircuitSummary[]>;
  find(idOrSlug: string): Promise<CircuitSummary | null>;
  slugTaken(slug: string, exceptId: string | null): Promise<boolean>;
  withSeason(season: number | null): Promise<CircuitSummary[]>;
  save(circuit: CircuitSummary): Promise<void>;
  remove(id: string): Promise<boolean>;
  stages(circuitId: string): Promise<CircuitStage[]>;
  stageResults(circuitId: string): Promise<StoredStageResult[]>;
  eventTeams(tournamentId: string): Promise<CircuitEventTeam[] | null>;
  saveStage(circuitId: string, tournamentId: string, settings: CircuitStageSettings): Promise<void>;
  removeStage(circuitId: string, tournamentId: string): Promise<boolean>;
}
