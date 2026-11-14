import type { CircuitStandings, CircuitSummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export const getCircuits = async (): Promise<CircuitSummary[]> => {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });

  return res.circuits;
};

export const getCircuitStandings = async (slug: string): Promise<CircuitStandings | null> => {
  try {
    return await apiFetch<CircuitStandings>(`/circuits/${encodeURIComponent(slug)}/standings`, {
      method: "GET",
    });
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};
