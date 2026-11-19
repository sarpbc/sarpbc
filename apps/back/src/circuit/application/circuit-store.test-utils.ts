import type { CircuitEventTeam, CircuitSummary } from "@sarpbc/types";
import type { CircuitStageSettings } from "../domain/circuit-scale";
import type { CircuitStore, StoredStageResult } from "./ports";

export class MemoryCircuitStore implements CircuitStore {
  readonly circuits = new Map<string, CircuitSummary>();
  readonly saved = new Map<string, CircuitStageSettings>();
  readonly results: StoredStageResult[] = [];

  constructor(private readonly teamsByTournament: Map<string, CircuitEventTeam[]>) {}

  async eventTeams(tournamentId: string) {
    return await Promise.resolve(this.teamsByTournament.get(tournamentId) ?? null);
  }

  async find(idOrSlug: string) {
    return await Promise.resolve(
      [...this.circuits.values()].find(({ id, slug }) => id === idOrSlug || slug === idOrSlug) ??
        null,
    );
  }

  async list() {
    return await Promise.resolve([...this.circuits.values()]);
  }

  async remove(id: string) {
    return await Promise.resolve(this.circuits.delete(id));
  }

  async removeStage(circuitId: string, tournamentId: string) {
    return await Promise.resolve(this.saved.delete(`${circuitId}:${tournamentId}`));
  }

  async save(circuit: CircuitSummary) {
    this.circuits.set(circuit.id, circuit);

    await Promise.resolve();
  }

  async saveStage(circuitId: string, tournamentId: string, stage: CircuitStageSettings) {
    this.saved.set(`${circuitId}:${tournamentId}`, stage);

    await Promise.resolve();
  }

  async slugTaken(slug: string, exceptId: string | null) {
    return await Promise.resolve(
      [...this.circuits.values()].some((c) => c.slug === slug && c.id !== exceptId),
    );
  }

  async stageResults() {
    return await Promise.resolve(this.results);
  }

  async stages() {
    return await Promise.resolve([]);
  }

  async withSeason(season: number | null) {
    return await Promise.resolve([...this.circuits.values()].filter((c) => c.season === season));
  }
}
