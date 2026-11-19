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

export const getSeasons = async () => {
  const res = await apiFetch<{ seasons: SeasonSummary[] }>("/seasons", { method: "GET" });

  return res.seasons;
};

export const getSeason = async (id: string) =>
  await apiFetch<SeasonDetail>(`/seasons/${id}`, { method: "GET" });

export const createSeason = async (input: SeasonInput) =>
  await apiFetch<SeasonDetail>("/seasons", { body: input, method: "POST" });

export const updateSeason = async (id: string, input: SeasonInput) =>
  await apiFetch<SeasonDetail>(`/seasons/${id}`, { body: input, method: "PATCH" });

export const deleteSeason = async (id: string) => {
  await apiFetch(`/seasons/${id}`, { method: "DELETE" });
};

export const createSeasonAward = async (seasonId: string, input: SeasonAwardInput) => {
  const res = await apiFetch<{ award: SeasonAward }>(`/seasons/${seasonId}/awards`, {
    body: input,
    method: "POST",
  });

  return res.award;
};

export const deleteSeasonAward = async (seasonId: string, awardId: string) => {
  await apiFetch(`/seasons/${seasonId}/awards/${awardId}`, { method: "DELETE" });
};

export const createSeasonParticipant = async (seasonId: string, input: SeasonParticipantInput) => {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants`,
    { body: input, method: "POST" },
  );

  return res.participant;
};

export const updateSeasonPathNote = async (
  seasonId: string,
  participantId: string,
  pathNote: string | null,
) => {
  const res = await apiFetch<{ participant: SeasonParticipant }>(
    `/seasons/${seasonId}/participants/${participantId}`,
    { body: { pathNote }, method: "PATCH" },
  );

  return res.participant;
};

export const deleteSeasonParticipant = async (seasonId: string, participantId: string) => {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}`, { method: "DELETE" });
};

export const createSeasonPathEntry = async (
  seasonId: string,
  participantId: string,
  input: SeasonPathEntryInput,
) => {
  const res = await apiFetch<{ entry: SeasonPathEntry }>(
    `/seasons/${seasonId}/participants/${participantId}/path`,
    { body: input, method: "POST" },
  );

  return res.entry;
};

export const deleteSeasonPathEntry = async (
  seasonId: string,
  participantId: string,
  entryId: string,
) => {
  await apiFetch(`/seasons/${seasonId}/participants/${participantId}/path/${entryId}`, {
    method: "DELETE",
  });
};
