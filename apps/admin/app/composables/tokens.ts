import type { CreatedPatToken, PatToken } from "@sarpbc/types";

export async function getPatTokens(): Promise<PatToken[]> {
  const res = await apiFetch<{ tokens: PatToken[] }>("/pat/tokens", {
    method: "GET",
  });

  return res.tokens ?? [];
}

export async function createPatToken(name: string): Promise<CreatedPatToken> {
  return await apiFetch<CreatedPatToken>("/pat/tokens", {
    method: "POST",
    body: { name },
  });
}

export async function revokePatToken(id: string): Promise<void> {
  await apiFetch(`/pat/tokens/${id}`, { method: "DELETE" });
}
