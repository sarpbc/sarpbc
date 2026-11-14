import type { CreatedPatToken, PatToken } from "@sarpbc/types";

export const getPatTokens = async (): Promise<PatToken[]> => {
  const res = await apiFetch<{ tokens: PatToken[] }>("/pat/tokens", {
    method: "GET",
  });

  return res.tokens ?? [];
};

export const createPatToken = async (name: string): Promise<CreatedPatToken> =>
  await apiFetch<CreatedPatToken>("/pat/tokens", {
    body: { name },
    method: "POST",
  });

export const revokePatToken = async (id: string): Promise<void> => {
  await apiFetch(`/pat/tokens/${id}`, { method: "DELETE" });
};
