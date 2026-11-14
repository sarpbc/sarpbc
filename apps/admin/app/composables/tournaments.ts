import type {
  AttachReplayInput,
  EventInput,
  League,
  LeagueInput,
  ManualEvent,
  MatchLineupInput,
  MatchLineupsResponse,
  PlayerAwardType,
  StatsImport,
  StatsPlayerAccounts,
  StatsPlayerLinkInput,
  StatsPlayerLinkResult,
  TournamentAwardListItem,
  TournamentDetail,
  TournamentListItem,
  TournamentMatchListItem,
  TournamentPrizes,
  TournamentFormat,
  TournamentStatsGame,
} from "@sarpbc/types";
import type { StreamScoreSeriesResult } from "@sarpbc/utils";

export const getAllTournaments = async (query: {
  limit: number;
  offset: number;
}): Promise<{ tournaments: TournamentListItem[]; total: number }> => {
  const res = await apiFetch<{ tournaments: TournamentListItem[]; count: number }>("/tournaments", {
    method: "GET",
    query,
  });

  return { tournaments: res.tournaments, total: res.count };
};

export const getTournamentById = async (id: string): Promise<TournamentDetail> => {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    method: "GET",
  });

  return res.tournament;
};

export const syncTournament = async (tournamentId: string): Promise<void> => {
  await apiFetch(`/tournaments/${tournamentId}/sync`, { method: "POST" });
};

export const getTournamentMatches = async (
  tournamentId: string,
): Promise<TournamentMatchListItem[]> => {
  const res = await apiFetch<{ matches: TournamentMatchListItem[] }>(
    `/tournaments/${tournamentId}/matches`,
    { method: "GET" },
  );

  return res.matches;
};

export const enableTournamentPickems = async (tournamentId: string): Promise<void> => {
  await apiFetch(`/tournaments/${tournamentId}/enable-pickems`, {
    method: "POST",
    body: { enabled: true },
  });
};

export const syncTournamentAdditions = async (): Promise<void> => {
  await apiFetch("/tournaments/sync/additions", { method: "POST" });
};

export const getTournamentsWithoutMatches = async (): Promise<{ id: string; name: string }[]> => {
  const res = await apiFetch<{ tournaments: { id: string; name: string }[] }>(
    "/tournaments/without-matches",
    { method: "GET" },
  );

  return res.tournaments;
};

export const setMatchWinner = async (matchId: string, winnerId: string): Promise<void> => {
  await apiFetch(`/tournaments/matches/${matchId}/winner`, {
    method: "PUT",
    body: { winnerId },
  });
};

export const setMatchResult = async (
  matchId: string,
  results: StreamScoreSeriesResult[],
): Promise<void> => {
  await apiFetch(`/tournaments/matches/${matchId}/result`, {
    method: "PUT",
    body: { results },
  });
};

export const setMatchSource = async (matchId: string, sourceUrl: string | null): Promise<void> => {
  await apiFetch(`/tournaments/matches/${matchId}/source`, {
    method: "PUT",
    body: { sourceUrl },
  });
};

export const getMatchLineups = async (matchId: string): Promise<MatchLineupsResponse> =>
  await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    method: "GET",
  });

export const setMatchLineups = async (
  matchId: string,
  lineups: MatchLineupInput[],
): Promise<MatchLineupsResponse> =>
  await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    method: "PUT",
    body: { lineups },
  });

/** A manual league can share its name with a synced one, so synced options say where they come from. */
export const leagueOptions = (leagues: League[], pandascoreLabel: string) =>
  leagues.map((league) => ({
    value: league.id,
    label: league.pandascoreId === null ? league.name : `${league.name} · ${pandascoreLabel}`,
  }));

export interface ManualTournamentInput {
  name: string;
  eventId?: string;
  slug?: string;
  tier?: string | null;
  leagueId?: string | null;
  beginAt?: string | null;
  endAt?: string | null;
  imageUrl?: string | null;
  format?: TournamentFormat;
  teamIds?: string[];
  playerParticipants?: string[][];
  rosters?: { teamId: string; playerIds: string[]; sourceUrl?: string | null }[];
  hasBracket?: boolean;
}

export const getTournamentLeagues = async (): Promise<League[]> => {
  const res = await apiFetch<{ leagues: League[] }>("/tournaments/leagues", {
    method: "GET",
  });

  return res.leagues;
};

export const createLeague = async (body: LeagueInput): Promise<League> => {
  const res = await apiFetch<{ league: League }>("/tournaments/leagues", {
    method: "POST",
    body,
  });

  return res.league;
};

export const updateLeague = async (id: string, body: LeagueInput): Promise<League> => {
  const res = await apiFetch<{ league: League }>(`/tournaments/leagues/${id}`, {
    method: "PATCH",
    body,
  });

  return res.league;
};

export const getManualEvents = async (): Promise<ManualEvent[]> => {
  const res = await apiFetch<{ events: ManualEvent[] }>("/events/manual", { method: "GET" });

  return res.events;
};

export const getManualEvent = async (id: string): Promise<ManualEvent> => {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/manual/${id}`, { method: "GET" });

  return res.event;
};

export const createEvent = async (body: EventInput): Promise<ManualEvent> => {
  const res = await apiFetch<{ event: ManualEvent }>("/events", { method: "POST", body });

  return res.event;
};

export const updateEvent = async (id: string, body: EventInput): Promise<ManualEvent> => {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/${id}`, { method: "PATCH", body });

  return res.event;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await apiFetch(`/events/${id}`, { method: "DELETE" });
};

export const createTournament = async (body: ManualTournamentInput): Promise<TournamentDetail> => {
  const res = await apiFetch<{ tournament: TournamentDetail }>("/tournaments", {
    method: "POST",
    body,
  });

  return res.tournament;
};

export const updateTournament = async (
  id: string,
  body: Partial<ManualTournamentInput>,
): Promise<TournamentDetail> => {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    method: "PATCH",
    body,
  });

  return res.tournament;
};

export const getTournamentAwards = async (
  tournamentId: string,
): Promise<TournamentAwardListItem[]> => {
  const res = await apiFetch<{ awards: TournamentAwardListItem[] }>(
    `/tournaments/${tournamentId}/awards`,
    { method: "GET" },
  );

  return res.awards;
};

export const createTournamentAward = async (
  tournamentId: string,
  payload: { participantId: string; playerId: string; awardType: PlayerAwardType },
): Promise<TournamentAwardListItem> => {
  const res = await apiFetch<{ award: TournamentAwardListItem }>(
    `/tournaments/${tournamentId}/awards`,
    { method: "POST", body: payload },
  );

  return res.award;
};

export const deleteTournamentAward = async (
  tournamentId: string,
  awardId: string,
): Promise<void> => {
  await apiFetch(`/tournaments/${tournamentId}/awards/${awardId}`, { method: "DELETE" });
};

export interface TournamentPrizeInput {
  placement: number;
  amount: number;
  currency: string;
  teamId: string;
  playerIds: string[];
  sourceUrl: string | null;
}

export const getTournamentPrizes = async (tournamentId: string): Promise<TournamentPrizes> =>
  await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });

export const setTournamentPrizes = async (
  tournamentId: string,
  prizes: TournamentPrizeInput[],
): Promise<TournamentPrizes> =>
  await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, {
    method: "PUT",
    body: { prizes },
  });

export const getStatsImports = async (tournamentId: string): Promise<StatsImport[]> => {
  const res = await apiFetch<{ imports: StatsImport[] }>(
    `/tournaments/${tournamentId}/stats-imports`,
    { method: "GET" },
  );

  return res.imports;
};

export const requestStatsImport = async (
  tournamentId: string,
  group: string,
): Promise<StatsImport> =>
  await apiFetch<StatsImport>(`/tournaments/${tournamentId}/stats-imports`, {
    method: "POST",
    body: { group },
  });

export const getStatsPlayerAccounts = async (tournamentId: string): Promise<StatsPlayerAccounts> =>
  await apiFetch<StatsPlayerAccounts>(`/tournaments/${tournamentId}/stats-players`, {
    method: "GET",
  });

export const getTournamentStatsGames = async (
  tournamentId: string,
): Promise<TournamentStatsGame[]> => {
  const res = await apiFetch<{ games: TournamentStatsGame[] }>(
    `/tournaments/${tournamentId}/stats-games`,
    { method: "GET" },
  );

  return res.games;
};

export const attachStatsReplay = async (
  tournamentId: string,
  body: AttachReplayInput,
): Promise<TournamentStatsGame> =>
  await apiFetch<TournamentStatsGame>(`/tournaments/${tournamentId}/stats-games`, {
    method: "POST",
    body,
  });

export const removeStatsGame = async (
  tournamentId: string,
  matchId: string,
  number: number,
): Promise<TournamentStatsGame> =>
  await apiFetch<TournamentStatsGame>(
    `/tournaments/${tournamentId}/stats-games/${matchId}/${number}`,
    { method: "DELETE" },
  );

export const linkStatsPlayer = async (
  tournamentId: string,
  body: StatsPlayerLinkInput,
): Promise<StatsPlayerLinkResult> =>
  await apiFetch<StatsPlayerLinkResult>(`/tournaments/${tournamentId}/stats-players/link`, {
    method: "PUT",
    body,
  });
