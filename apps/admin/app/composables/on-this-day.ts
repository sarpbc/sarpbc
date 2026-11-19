import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";

export const getOnThisDayFacts = async () => {
  const res = await apiFetch<{ facts: OnThisDayFact[] }>("/on-this-day-facts", { method: "GET" });

  return res.facts;
};

export const createOnThisDayFact = async (input: OnThisDayFactInput) => {
  const res = await apiFetch<{ fact: OnThisDayFact }>("/on-this-day-facts", {
    body: input,
    method: "POST",
  });

  return res.fact;
};

export const updateOnThisDayFact = async (id: string, input: OnThisDayFactInput) => {
  const res = await apiFetch<{ fact: OnThisDayFact }>(`/on-this-day-facts/${id}`, {
    body: input,
    method: "PATCH",
  });

  return res.fact;
};

export const deleteOnThisDayFact = async (id: string) => {
  await apiFetch(`/on-this-day-facts/${id}`, { method: "DELETE" });
};
