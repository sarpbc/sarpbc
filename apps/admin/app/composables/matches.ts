import type {
  BracketLinkInput,
  CountedMatchListItem,
  EmptyBracketSize,
  MatchBlocksResponse,
  MatchVod,
  UpcomingMatchesResponse,
} from "@sarpbc/types";

export const getUpcomingMatches = async (limit: number): Promise<CountedMatchListItem[]> => {
  const res = await apiFetch<UpcomingMatchesResponse>("/matches/upcoming", {
    method: "GET",
    query: { limit },
  });

  return res.upcoming;
};

export const getMatchBlocks = async (blockKey: string): Promise<MatchBlocksResponse> =>
  await apiFetch<MatchBlocksResponse>("/matches/blocks", { query: { block: blockKey } });

export const getMatchVods = async (matchId: string): Promise<MatchVod[]> => {
  const res = await apiFetch<{ match: { vods?: MatchVod[] } }>(`/matches/${matchId}`, {
    method: "GET",
  });

  return res.match.vods ?? [];
};

export const deleteMatch = async (matchId: string): Promise<void> => {
  await apiFetch(`/tournaments/matches/${matchId}`, { method: "DELETE" });
};

export const setMatchVods = async (
  matchId: string,
  vods: Omit<MatchVod, "source">[],
): Promise<MatchVod[]> => {
  const res = await apiFetch<{ match: { vods: MatchVod[] } }>(
    `/tournaments/matches/${matchId}/vods`,
    { method: "PUT", body: { vods } },
  );

  return res.match.vods;
};

export const setMatchBracket = async (
  matchId: string,
  body: { participantIds: string[]; previousMatches: BracketLinkInput[] },
): Promise<void> => {
  await apiFetch(`/tournaments/matches/${matchId}/bracket`, { method: "PUT", body });
};

export const createEmptyBracket = async (
  tournamentId: string,
  body: { teams: EmptyBracketSize; numberOfGames?: number },
): Promise<void> => {
  await apiFetch(`/tournaments/${tournamentId}/bracket`, { method: "POST", body });
};
