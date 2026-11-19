import type { CircuitStandings, CircuitSummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export const getCircuits = async () => {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });

  return res.circuits;
};

export const getCircuitStandings = async (slug: string) => {
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
