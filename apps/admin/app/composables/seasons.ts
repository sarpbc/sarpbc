import type {
  SeasonAward,
  SeasonAwardInput,
  SeasonDetail,
  SeasonInput,
  SeasonSummary,
} from "@sarpbc/types";

export async function getSeasons(): Promise<SeasonSummary[]> {
  const res = await apiFetch<{ seasons: SeasonSummary[] }>("/seasons", { method: "GET" });
  return res.seasons;
}

export async function getSeason(id: string): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "GET" });
}

export async function createSeason(input: SeasonInput): Promise<SeasonSummary> {
  return apiFetch<SeasonSummary>("/seasons", { method: "POST", body: input });
}

export async function updateSeason(id: string, input: SeasonInput): Promise<SeasonSummary> {
  return apiFetch<SeasonSummary>(`/seasons/${id}`, { method: "PATCH", body: input });
}

export async function deleteSeason(id: string): Promise<void> {
  await apiFetch(`/seasons/${id}`, { method: "DELETE" });
}

export async function createSeasonAward(
  seasonId: string,
  input: SeasonAwardInput,
): Promise<SeasonAward> {
  const res = await apiFetch<{ award: SeasonAward }>(`/seasons/${seasonId}/awards`, {
    method: "POST",
    body: input,
  });
  return res.award;
}

export async function deleteSeasonAward(seasonId: string, awardId: string): Promise<void> {
  await apiFetch(`/seasons/${seasonId}/awards/${awardId}`, { method: "DELETE" });
}
