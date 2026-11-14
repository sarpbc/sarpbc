import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";

export const getOnThisDayFacts = async (): Promise<OnThisDayFact[]> => {
  const res = await apiFetch<{ facts: OnThisDayFact[] }>("/on-this-day-facts", { method: "GET" });

  return res.facts;
};

export const createOnThisDayFact = async (input: OnThisDayFactInput): Promise<OnThisDayFact> => {
  const res = await apiFetch<{ fact: OnThisDayFact }>("/on-this-day-facts", {
    method: "POST",
    body: input,
  });

  return res.fact;
};

export const updateOnThisDayFact = async (
  id: string,
  input: OnThisDayFactInput,
): Promise<OnThisDayFact> => {
  const res = await apiFetch<{ fact: OnThisDayFact }>(`/on-this-day-facts/${id}`, {
    method: "PATCH",
    body: input,
  });

  return res.fact;
};

export const deleteOnThisDayFact = async (id: string): Promise<void> => {
  await apiFetch(`/on-this-day-facts/${id}`, { method: "DELETE" });
};
