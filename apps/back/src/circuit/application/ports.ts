import type { CircuitScaleTier, CircuitStage, CircuitSummary, DataSource } from "@sarpbc/types";
import type { CircuitStageResult } from "../domain/circuit-standings";

export interface CircuitStore {
  list(): Promise<CircuitSummary[]>;
  find(idOrSlug: string): Promise<CircuitSummary | null>;
  slugTaken(slug: string, exceptId: string | null): Promise<boolean>;
  save(circuit: CircuitSummary): Promise<void>;
  remove(id: string): Promise<boolean>;
  stages(circuitId: string): Promise<CircuitStage[]>;
  stageResults(circuitId: string): Promise<CircuitStageResult[]>;
  tournamentSource(id: string): Promise<DataSource | null>;
  saveStage(
    circuitId: string,
    tournamentId: string,
    stage: { scale: CircuitScaleTier[]; sourceUrl: string },
  ): Promise<void>;
  removeStage(circuitId: string, tournamentId: string): Promise<boolean>;
}
