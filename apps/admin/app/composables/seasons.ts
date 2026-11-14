import type {
  SeasonAward,
  SeasonAwardInput,
  SeasonDetail,
  SeasonInput,
  SeasonParticipant,
  SeasonParticipantInput,
  SeasonPathEntry,
  SeasonPathEntryInput,
  SeasonSummary,
} from "@sarpbc/types";

export async function getSeasons(): Promise<SeasonSummary[]> {
  const res = await apiFetch<{ seasons: SeasonSummary[] }>("/seasons", { method: "GET" });

  return res.seasons;
}

export async function getSeason(id: string): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "GET" });
}

export async function createSeason(input: SeasonInput): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>("/seasons", { method: "POST", body: input });
}

export async function updateSeason(id: string, input: SeasonInput): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "PATCH", body: input });
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

export async function createSeasonParticipant(
  seasonId: string,
  input: SeasonParticipantInput,
): Promise<SeasonParticipant> {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants`,
    { method: "POST", body: input },
  );

  return res.participant;
}

export async function updateSeasonPathNote(
  seasonId: string,
  participantId: string,
  pathNote: string | null,
): Promise<SeasonParticipant> {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants/${participantId}`,
    { method: "PATCH", body: { pathNote } },
  );

  return res.participant;
}

export async function deleteSeasonParticipant(
  seasonId: string,
  participantId: string,
): Promise<void> {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}`, { method: "DELETE" });
}

export async function createSeasonPathEntry(
  seasonId: string,
  participantId: string,
  input: SeasonPathEntryInput,
): Promise<SeasonPathEntry> {
  const res = await apiFetch<{ entry: SeasonPathEntry }>(
    `/seasons/${seasonId}/participants/${participantId}/path`,
    { method: "POST", body: input },
  );

  return res.entry;
}

export async function deleteSeasonPathEntry(
  seasonId: string,
  participantId: string,
  entryId: string,
): Promise<void> {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}/path/${entryId}`, {
    method: "DELETE",
  });
}
