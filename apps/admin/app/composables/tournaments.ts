import type {
  AppendReplayInput,
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

export const getAllTournaments = async (query: { limit: number; offset: number }) => {
  const res = await apiFetch<{ tournaments: TournamentListItem[]; count: number }>("/tournaments", {
    method: "GET",
    query: { limit: query.limit, offset: query.offset },
  });

  return { total: res.count, tournaments: res.tournaments };
};

export const getTournamentById = async (id: string) => {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    method: "GET",
  });

  return res.tournament;
};

export const syncTournament = async (tournamentId: string) => {
  await apiFetch(`/tournaments/${tournamentId}/sync`, { method: "POST" });
};

export const getTournamentMatches = async (tournamentId: string) => {
  const res = await apiFetch<{ matches: TournamentMatchListItem[] }>(
    `/tournaments/${tournamentId}/matches`,
    { method: "GET" },
  );

  return res.matches;
};

export const enableTournamentPickems = async (tournamentId: string) => {
  await apiFetch(`/tournaments/${tournamentId}/enable-pickems`, {
    body: { enabled: true },
    method: "POST",
  });
};

export const syncTournamentAdditions = async () => {
  await apiFetch("/tournaments/sync/additions", { method: "POST" });
};

export const getTournamentsWithoutMatches = async () => {
  const res = await apiFetch<{ tournaments: { id: string; name: string }[] }>(
    "/tournaments/without-matches",
    { method: "GET" },
  );

  return res.tournaments;
};

export const setMatchWinner = async (matchId: string, winnerId: string) => {
  await apiFetch(`/tournaments/matches/${matchId}/winner`, {
    body: { winnerId },
    method: "PUT",
  });
};

export const setMatchSource = async (matchId: string, sourceUrl: string | null) => {
  await apiFetch(`/tournaments/matches/${matchId}/source`, {
    body: { sourceUrl },
    method: "PUT",
  });
};

export const getMatchLineups = async (matchId: string) =>
  await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    method: "GET",
  });

export const setMatchLineups = async (matchId: string, lineups: MatchLineupInput[]) =>
  await apiFetch<MatchLineupsResponse>(`/tournaments/matches/${matchId}/lineups`, {
    body: { lineups },
    method: "PUT",
  });

/** A manual league can share its name with a synced one, so synced options say where they come from. */
export const leagueOptions = (leagues: League[], pandascoreLabel: string) =>
  leagues.map((league) => ({
    label: league.pandascoreId === null ? league.name : `${league.name} · ${pandascoreLabel}`,
    value: league.id,
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

export const getTournamentLeagues = async () => {
  const res = await apiFetch<{ leagues: League[] }>("/tournaments/leagues", {
    method: "GET",
  });

  return res.leagues;
};

export const createLeague = async (body: LeagueInput) => {
  const res = await apiFetch<{ league: League }>("/tournaments/leagues", {
    body,
    method: "POST",
  });

  return res.league;
};

export const updateLeague = async (id: string, body: LeagueInput) => {
  const res = await apiFetch<{ league: League }>(`/tournaments/leagues/${id}`, {
    body,
    method: "PATCH",
  });

  return res.league;
};

export const getManualEvents = async () => {
  const res = await apiFetch<{ events: ManualEvent[] }>("/events/manual", { method: "GET" });

  return res.events;
};

export const getManualEvent = async (id: string) => {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/manual/${id}`, { method: "GET" });

  return res.event;
};

export const createEvent = async (body: EventInput) => {
  const res = await apiFetch<{ event: ManualEvent }>("/events", { body, method: "POST" });

  return res.event;
};

export const updateEvent = async (id: string, body: EventInput) => {
  const res = await apiFetch<{ event: ManualEvent }>(`/events/${id}`, { body, method: "PATCH" });

  return res.event;
};

export const deleteEvent = async (id: string) => {
  await apiFetch(`/events/${id}`, { method: "DELETE" });
};

export const deleteTournament = async (id: string) => {
  await apiFetch(`/tournaments/${id}`, { method: "DELETE" });
};

export const createTournament = async (body: ManualTournamentInput) => {
  const res = await apiFetch<{ tournament: TournamentDetail }>("/tournaments", {
    body,
    method: "POST",
  });

  return res.tournament;
};

export const updateTournament = async (id: string, body: Partial<ManualTournamentInput>) => {
  const res = await apiFetch<{ tournament: TournamentDetail }>(`/tournaments/${id}`, {
    body,
    method: "PATCH",
  });

  return res.tournament;
};

export const getTournamentAwards = async (tournamentId: string) => {
  const res = await apiFetch<{ awards: TournamentAwardListItem[] }>(
    `/tournaments/${tournamentId}/awards`,
    { method: "GET" },
  );

  return res.awards;
};

export const createTournamentAward = async (
  tournamentId: string,
  payload: { participantId: string; playerId: string; awardType: PlayerAwardType },
) => {
  const res = await apiFetch<{ award: TournamentAwardListItem }>(
    `/tournaments/${tournamentId}/awards`,
    { body: payload, method: "POST" },
  );

  return res.award;
};

export const deleteTournamentAward = async (tournamentId: string, awardId: string) => {
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

export const getTournamentPrizes = async (tournamentId: string) =>
  await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, { method: "GET" });

export const setTournamentPrizes = async (tournamentId: string, prizes: TournamentPrizeInput[]) =>
  await apiFetch<TournamentPrizes>(`/tournaments/${tournamentId}/prizes`, {
    body: { prizes },
    method: "PUT",
  });

export const getStatsImports = async (tournamentId: string) => {
  const res = await apiFetch<{ imports: StatsImport[] }>(
    `/tournaments/${tournamentId}/stats-imports`,
    { method: "GET" },
  );

  return res.imports;
};

export const requestStatsImport = async (tournamentId: string, group: string) =>
  await apiFetch<StatsImport>(`/tournaments/${tournamentId}/stats-imports`, {
    body: { group },
    method: "POST",
  });

export const getStatsPlayerAccounts = async (tournamentId: string) =>
  await apiFetch<StatsPlayerAccounts>(`/tournaments/${tournamentId}/stats-players`, {
    method: "GET",
  });

export const getTournamentStatsGames = async (tournamentId: string) => {
  const res = await apiFetch<{ games: TournamentStatsGame[] }>(
    `/tournaments/${tournamentId}/stats-games`,
    { method: "GET" },
  );

  return res.games;
};

export const attachStatsReplay = async (tournamentId: string, body: AttachReplayInput) =>
  await apiFetch<TournamentStatsGame>(`/tournaments/${tournamentId}/stats-games`, {
    body,
    method: "POST",
  });

export const removeStatsGame = async (tournamentId: string, matchId: string, number: number) =>
  await apiFetch<TournamentStatsGame>(
    `/tournaments/${tournamentId}/stats-games/${matchId}/${number}`,
    { method: "DELETE" },
  );

export const appendStatsReplay = async (
  tournamentId: string,
  matchId: string,
  number: number,
  body: AppendReplayInput,
) =>
  await apiFetch<TournamentStatsGame>(
    `/tournaments/${tournamentId}/stats-games/${matchId}/${number}/replays`,
    { body, method: "POST" },
  );

export const removeStatsReplay = async (
  tournamentId: string,
  matchId: string,
  number: number,
  replayId: string,
) =>
  await apiFetch<TournamentStatsGame>(
    `/tournaments/${tournamentId}/stats-games/${matchId}/${number}/replays/${replayId}`,
    { method: "DELETE" },
  );

export const linkStatsPlayer = async (tournamentId: string, body: StatsPlayerLinkInput) =>
  await apiFetch<StatsPlayerLinkResult>(`/tournaments/${tournamentId}/stats-players/link`, {
    body,
    method: "PUT",
  });
