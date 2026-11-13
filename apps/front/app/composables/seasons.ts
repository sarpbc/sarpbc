import type { SeasonArchive, SeasonArchiveSummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export async function getSeasonArchives(): Promise<SeasonArchiveSummary[]> {
  const res = await apiFetch<{ seasons: SeasonArchiveSummary[] }>("/season-archives", {
    method: "GET",
  });
  return res.seasons;
}

export async function getSeasonArchive(slug: string): Promise<SeasonArchive | null> {
  try {
    return await apiFetch<SeasonArchive>(`/season-archives/${encodeURIComponent(slug)}`, {
      method: "GET",
    });
  } catch (cause) {
    if (getApiErrorStatus(cause) === 404) {
      return null;
    }
    throw cause;
  }
}
