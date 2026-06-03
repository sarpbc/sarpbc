import type { Match } from "~/types/matches";

export async function getUpcomingMatches(query?: {
  limit?: number;
}): Promise<{ live: Match[]; upcoming: Match[] }> {
  const config = useRuntimeConfig();
  const { limit } = query || {};
  try {
    const url = new URL(`${config.public.apiBase}/matches/upcoming`);
    if (limit !== undefined) {
      url.searchParams.set("limit", String(limit));
    }

    const res = await $fetch<{ live: Match[]; upcoming: Match[] }>(url.toString(), {
      method: "GET",
      credentials: "include",
    });

    return { live: res.live ?? [], upcoming: res.upcoming ?? [] };
  } catch (error) {
    console.error("Error fetching upcoming matches:", error);
    return { live: [], upcoming: [] };
  }
}

export async function getMatchesResults(query?: { limit?: number }): Promise<Match[]> {
  const config = useRuntimeConfig();
  const { limit } = query || {};
  try {
    const url = new URL(`${config.public.apiBase}/matches/results`);
    if (limit !== undefined) {
      url.searchParams.set("limit", String(limit));
    }

    const res = await $fetch<{ results?: Match[] }>(url.toString(), {
      method: "GET",
      credentials: "include",
    });

    return res.results ?? [];
  } catch (error) {
    console.error("Error fetching matches results:", error);
    return [];
  }
}
