import type { SeasonArchive, SeasonArchiveSummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export const getSeasonArchives = async (): Promise<SeasonArchiveSummary[]> => {
  const res = await apiFetch<{ seasons: SeasonArchiveSummary[] }>("/season-archives", {
    method: "GET",
  });

  return res.seasons;
};

export const getSeasonArchive = async (slug: string): Promise<SeasonArchive | null> => {
  try {
    return await apiFetch<SeasonArchive>(`/season-archives/${encodeURIComponent(slug)}`, {
      method: "GET",
    });
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};
