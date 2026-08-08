import type { CreatePatTokenResponse, PatToken } from "~/types/token";

export async function getPatTokens(): Promise<PatToken[]> {
  const res = await apiFetch<{ tokens: PatToken[] }>("/pat/tokens", {
    method: "GET",
  });
  return res.tokens ?? [];
}

export async function createPatToken(name: string): Promise<CreatePatTokenResponse> {
  return apiFetch<CreatePatTokenResponse>("/pat/tokens", {
    method: "POST",
    body: { name },
  });
}

export async function revokePatToken(id: string): Promise<void> {
  await apiFetch(`/pat/tokens/${id}`, { method: "DELETE" });
}
