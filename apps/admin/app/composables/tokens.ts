import type { CreatedPatToken, PatToken } from "@sarpbc/types";

export const getPatTokens = async () => {
  const res = await apiFetch<{ tokens: PatToken[] }>("/pat/tokens", {
    method: "GET",
  });

  return res.tokens ?? [];
};

export const createPatToken = async (name: string) =>
  await apiFetch<CreatedPatToken>("/pat/tokens", {
    body: { name },
    method: "POST",
  });

export const revokePatToken = async (id: string) => {
  await apiFetch(`/pat/tokens/${id}`, { method: "DELETE" });
};
