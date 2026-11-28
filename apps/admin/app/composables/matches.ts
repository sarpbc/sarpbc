import type {
  BracketLinkInput,
  EmptyBracketSize,
  MatchBlocksResponse,
  MatchVod,
  UpcomingMatchesResponse,
} from "@sarpbc/types";

export const getUpcomingMatches = async (limit: number) => {
  const res = await apiFetch<UpcomingMatchesResponse>("/matches/upcoming", {
    method: "GET",
    query: { limit },
  });

  return res.upcoming;
};

export const getMatchBlocks = async (blockKey: string) =>
  await apiFetch<MatchBlocksResponse>("/matches/blocks", { query: { block: blockKey } });

export const getMatchVods = async (matchId: string) => {
  const res = await apiFetch<{ match: { vods?: MatchVod[] } }>(`/matches/${matchId}`, {
    method: "GET",
  });

  return res.match.vods ?? [];
};

export const deleteMatch = async (matchId: string) => {
  await apiFetch(`/tournaments/matches/${matchId}`, { method: "DELETE" });
};

export const setMatchVods = async (matchId: string, vods: Omit<MatchVod, "source">[]) => {
  const res = await apiFetch<{ match: { vods: MatchVod[] } }>(
    `/tournaments/matches/${matchId}/vods`,
    { body: { vods }, method: "PUT" },
  );

  return res.match.vods;
};

export const setMatchForfeit = async (matchId: string, participantId: string | null) => {
  await apiFetch(`/tournaments/matches/${matchId}/forfeit`, {
    body: { participantId },
    method: "PUT",
  });
};

export const setMatchBracket = async (
  matchId: string,
  body: { participantIds: string[]; previousMatches: BracketLinkInput[] },
) => {
  await apiFetch(`/tournaments/matches/${matchId}/bracket`, { body, method: "PUT" });
};

export const createEmptyBracket = async (
  tournamentId: string,
  body: { teams: EmptyBracketSize; numberOfGames?: number },
) => {
  await apiFetch(`/tournaments/${tournamentId}/bracket`, { body, method: "POST" });
};

export type EditableMatchStatus = "not_started" | "running" | "finished";

interface MatchScoreInput {
  participantId: string;
  score: number;
}

export interface CreateMatchInput {
  name: string;
  participantIds: string[];
  numberOfGames?: number;
  beginAt?: string;
  endAt?: string;
  status: EditableMatchStatus;
  results?: MatchScoreInput[];
}

export interface UpdateMatchInput {
  name?: string;
  numberOfGames?: number | null;
  beginAt?: string | null;
  endAt?: string | null;
  status?: EditableMatchStatus;
  results?: MatchScoreInput[];
}

export const createMatch = async (tournamentId: string, body: CreateMatchInput) => {
  await apiFetch(`/tournaments/${tournamentId}/matches`, { body, method: "POST" });
};

export const updateMatch = async (matchId: string, body: UpdateMatchInput) => {
  await apiFetch(`/tournaments/matches/${matchId}`, { body, method: "PATCH" });
};
