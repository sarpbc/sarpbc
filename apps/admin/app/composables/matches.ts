import type { UpcomingMatch } from "~/types/matches";
import { apiFetch } from "~/utils/apiFetch";

export async function getUpcomingMatches(limit: number): Promise<UpcomingMatch[]> {
  const res = await apiFetch<{ upcoming: UpcomingMatch[] }>("/matches/upcoming", {
    method: "GET",
    query: { limit },
  });
  return res.upcoming;
}
