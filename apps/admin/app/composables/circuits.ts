import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitInput,
  CircuitStageScaleInput,
  CircuitSummary,
} from "@sarpbc/types";

export const getCircuits = async (): Promise<CircuitSummary[]> => {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });

  return res.circuits;
};

export const getCircuit = async (idOrSlug: string): Promise<CircuitDetail> =>
  await apiFetch<CircuitDetail>(`/circuits/${idOrSlug}`, { method: "GET" });

export const createCircuit = async (input: CircuitInput): Promise<CircuitSummary> =>
  await apiFetch<CircuitSummary>("/circuits", { method: "POST", body: input });

export const updateCircuit = async (
  id: string,
  input: Partial<CircuitInput>,
): Promise<CircuitSummary> =>
  await apiFetch<CircuitSummary>(`/circuits/${id}`, { method: "PATCH", body: input });

export const deleteCircuit = async (id: string): Promise<void> => {
  await apiFetch(`/circuits/${id}`, { method: "DELETE" });
};

export const setCircuitStageScale = async (
  circuitId: string,
  tournamentId: string,
  input: CircuitStageScaleInput,
): Promise<CircuitDetail> =>
  await apiFetch<CircuitDetail>(`/circuits/${circuitId}/stages/${tournamentId}`, {
    method: "PUT",
    body: input,
  });

export const removeCircuitStage = async (
  circuitId: string,
  tournamentId: string,
): Promise<void> => {
  await apiFetch(`/circuits/${circuitId}/stages/${tournamentId}`, { method: "DELETE" });
};

export const getCircuitStageTeams = async (
  circuitId: string,
  tournamentId: string,
): Promise<CircuitEventTeam[]> => {
  const res = await apiFetch<{ teams: CircuitEventTeam[] }>(
    `/circuits/${circuitId}/stages/${tournamentId}/teams`,
    { method: "GET" },
  );

  return res.teams;
};
