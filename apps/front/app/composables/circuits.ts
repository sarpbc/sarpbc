import type { CircuitStandings, CircuitSummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export async function getCircuits(): Promise<CircuitSummary[]> {
  const res = await apiFetch<{ circuits: CircuitSummary[] }>("/circuits", { method: "GET" });

  return res.circuits;
}

export async function getCircuitStandings(slug: string): Promise<CircuitStandings | null> {
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
}
