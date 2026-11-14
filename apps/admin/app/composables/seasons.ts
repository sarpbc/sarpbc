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

export const getSeasons = async (): Promise<SeasonSummary[]> => {
  const res = await apiFetch<{ seasons: SeasonSummary[] }>("/seasons", { method: "GET" });

  return res.seasons;
};

export const getSeason = async (id: string): Promise<SeasonDetail> =>
  await apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "GET" });

export const createSeason = async (input: SeasonInput): Promise<SeasonDetail> =>
  await apiFetch<SeasonDetail>("/seasons", { method: "POST", body: input });

export const updateSeason = async (id: string, input: SeasonInput): Promise<SeasonDetail> =>
  await apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "PATCH", body: input });

export const deleteSeason = async (id: string): Promise<void> => {
  await apiFetch(`/seasons/${id}`, { method: "DELETE" });
};

export const createSeasonAward = async (
  seasonId: string,
  input: SeasonAwardInput,
): Promise<SeasonAward> => {
  const res = await apiFetch<{ award: SeasonAward }>(`/seasons/${seasonId}/awards`, {
    method: "POST",
    body: input,
  });

  return res.award;
};

export const deleteSeasonAward = async (seasonId: string, awardId: string): Promise<void> => {
  await apiFetch(`/seasons/${seasonId}/awards/${awardId}`, { method: "DELETE" });
};

export const createSeasonParticipant = async (
  seasonId: string,
  input: SeasonParticipantInput,
): Promise<SeasonParticipant> => {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants`,
    { method: "POST", body: input },
  );

  return res.participant;
};

export const updateSeasonPathNote = async (
  seasonId: string,
  participantId: string,
  pathNote: string | null,
): Promise<SeasonParticipant> => {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants/${participantId}`,
    { method: "PATCH", body: { pathNote } },
  );

  return res.participant;
};

export const deleteSeasonParticipant = async (
  seasonId: string,
  participantId: string,
): Promise<void> => {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}`, { method: "DELETE" });
};

export const createSeasonPathEntry = async (
  seasonId: string,
  participantId: string,
  input: SeasonPathEntryInput,
): Promise<SeasonPathEntry> => {
  const res = await apiFetch<{ entry: SeasonPathEntry }>(
    `/seasons/${seasonId}/participants/${participantId}/path`,
    { method: "POST", body: input },
  );

  return res.entry;
};

export const deleteSeasonPathEntry = async (
  seasonId: string,
  participantId: string,
  entryId: string,
): Promise<void> => {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}/path/${entryId}`, {
    method: "DELETE",
  });
};
