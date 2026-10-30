import type { MatchVod } from "@sarpbc/types";
import type { UpcomingMatch } from "~/types/matches";
import { apiFetch } from "~/utils/apiFetch";

export async function getUpcomingMatches(limit: number): Promise<UpcomingMatch[]> {
  const res = await apiFetch<{ upcoming: UpcomingMatch[] }>("/matches/upcoming", {
    method: "GET",
    query: { limit },
  });
  return res.upcoming;
}

export async function getMatchVods(matchId: string): Promise<MatchVod[]> {
  const res = await apiFetch<{ match: { vods?: MatchVod[] } }>(`/matches/${matchId}`, {
    method: "GET",
  });
  return res.match.vods ?? [];
}

export async function setMatchVods(
  matchId: string,
  vods: Array<Omit<MatchVod, "source">>,
): Promise<MatchVod[]> {
  const res = await apiFetch<{ match: { vods: MatchVod[] } }>(
    `/tournaments/matches/${matchId}/vods`,
    { method: "PUT", body: { vods } },
  );
  return res.match.vods;
}
