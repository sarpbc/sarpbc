import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";

export async function getOnThisDayFacts(): Promise<OnThisDayFact[]> {
  const res = await apiFetch<{ facts: OnThisDayFact[] }>("/on-this-day-facts", { method: "GET" });

  return res.facts;
}

export async function createOnThisDayFact(input: OnThisDayFactInput): Promise<OnThisDayFact> {
  const res = await apiFetch<{ fact: OnThisDayFact }>("/on-this-day-facts", {
    method: "POST",
    body: input,
  });

  return res.fact;
}

export async function updateOnThisDayFact(
  id: string,
  input: OnThisDayFactInput,
): Promise<OnThisDayFact> {
  const res = await apiFetch<{ fact: OnThisDayFact }>(`/on-this-day-facts/${id}`, {
    method: "PATCH",
    body: input,
  });

  return res.fact;
}

export async function deleteOnThisDayFact(id: string): Promise<void> {
  await apiFetch(`/on-this-day-facts/${id}`, { method: "DELETE" });
}
