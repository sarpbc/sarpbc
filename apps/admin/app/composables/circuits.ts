import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitInput,
  CircuitStageScaleInput,
  CircuitSummary,
} from "@sarpbc/types";

export const getCircuits = async () => {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });

  return res.circuits;
};

export const getCircuit = async (idOrSlug: string) =>
  await apiFetch<CircuitDetail>(`/circuits/${idOrSlug}`, { method: "GET" });

export const createCircuit = async (input: CircuitInput) =>
  await apiFetch<CircuitSummary>("/circuits", { body: input, method: "POST" });

export const updateCircuit = async (id: string, input: Partial<CircuitInput>) =>
  await apiFetch<CircuitSummary>(`/circuits/${id}`, { body: input, method: "PATCH" });

export const deleteCircuit = async (id: string) => {
  await apiFetch(`/circuits/${id}`, { method: "DELETE" });
};

export const setCircuitStageScale = async (
  circuitId: string,
  tournamentId: string,
  input: CircuitStageScaleInput,
) =>
  await apiFetch<CircuitDetail>(`/circuits/${circuitId}/stages/${tournamentId}`, {
    body: input,
    method: "PUT",
  });

export const removeCircuitStage = async (circuitId: string, tournamentId: string) => {
  await apiFetch(`/circuits/${circuitId}/stages/${tournamentId}`, { method: "DELETE" });
};

export const getCircuitStageTeams = async (circuitId: string, tournamentId: string) => {
  const res = await apiFetch<{ teams: CircuitEventTeam[] }>(
    `/circuits/${circuitId}/stages/${tournamentId}/teams`,
    { method: "GET" },
  );

  return res.teams;
};
