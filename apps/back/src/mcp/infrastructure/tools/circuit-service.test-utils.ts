import type { CircuitDetail, CircuitInput, CircuitStandings, CircuitSummary } from "@sarpbc/types";
import type { CircuitService } from "../../../circuit/application/circuit.service";

export class FakeCircuitService implements Pick<
  CircuitService,
  "list" | "detail" | "standings" | "create" | "update"
> {
  readonly created: CircuitInput[] = [];
  readonly updated: { idOrSlug: string; input: Partial<CircuitInput> }[] = [];
  private readonly circuit: CircuitSummary;
  private readonly circuitDetail: CircuitDetail;
  private readonly circuitStandings: CircuitStandings;

  constructor(
    circuit: CircuitSummary,
    circuitDetail?: CircuitDetail,
    circuitStandings?: CircuitStandings,
  ) {
    this.circuit = circuit;
    this.circuitDetail = circuitDetail ?? { ...circuit, stages: [] };
    this.circuitStandings = circuitStandings ?? {
      ...circuit,
      events: [],
      rows: [],
      sourceUrls: [],
    };
  }

  async list() {
    return [this.circuit];
  }

  async detail() {
    return this.circuitDetail;
  }

  async standings() {
    return this.circuitStandings;
  }

  async create(input: CircuitInput) {
    this.created.push(input);

    return this.circuit;
  }

  async update(idOrSlug: string, input: Partial<CircuitInput>) {
    this.updated.push({ idOrSlug, input });

    return this.circuit;
  }
}
