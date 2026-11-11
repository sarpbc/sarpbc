import type {
  CircuitDetail,
  CircuitInput,
  CircuitStageScaleInput,
  CircuitSummary,
} from "@sarpbc/types";

export async function getCircuits(): Promise<CircuitSummary[]> {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });
  return res.circuits;
}

export async function getCircuit(idOrSlug: string): Promise<CircuitDetail> {
  return apiFetch<CircuitDetail>(`/circuits/${idOrSlug}`, { method: "GET" });
}

export async function createCircuit(input: CircuitInput): Promise<CircuitSummary> {
  return apiFetch<CircuitSummary>("/circuits", { method: "POST", body: input });
}

export async function updateCircuit(
  id: string,
  input: Partial<CircuitInput>,
): Promise<CircuitSummary> {
  return apiFetch<CircuitSummary>(`/circuits/${id}`, { method: "PATCH", body: input });
}

export async function deleteCircuit(id: string): Promise<void> {
  await apiFetch(`/circuits/${id}`, { method: "DELETE" });
}

export async function setCircuitStageScale(
  circuitId: string,
  tournamentId: string,
  input: CircuitStageScaleInput,
): Promise<CircuitDetail> {
  return apiFetch<CircuitDetail>(`/circuits/${circuitId}/stages/${tournamentId}`, {
    method: "PUT",
    body: input,
  });
}

export async function removeCircuitStage(circuitId: string, tournamentId: string): Promise<void> {
  await apiFetch(`/circuits/${circuitId}/stages/${tournamentId}`, { method: "DELETE" });
}
