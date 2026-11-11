import type {
  CountedMatchListItem,
  MatchBlocksResponse,
  MatchVod,
  UpcomingMatchesResponse,
} from "@sarpbc/types";

export async function getUpcomingMatches(limit: number): Promise<CountedMatchListItem[]> {
  const res = await apiFetch<UpcomingMatchesResponse>("/matches/upcoming", {
    method: "GET",
    query: { limit },
  });
  return res.upcoming;
}

export async function getMatchBlocks(blockKey: string): Promise<MatchBlocksResponse> {
  return apiFetch<MatchBlocksResponse>("/matches/blocks", { query: { block: blockKey } });
}

export async function getMatchVods(matchId: string): Promise<MatchVod[]> {
  const res = await apiFetch<{ match: { vods?: MatchVod[] } }>(`/matches/${matchId}`, {
    method: "GET",
  });
  return res.match.vods ?? [];
}

export async function deleteMatch(matchId: string): Promise<void> {
  await apiFetch(`/tournaments/matches/${matchId}`, { method: "DELETE" });
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
